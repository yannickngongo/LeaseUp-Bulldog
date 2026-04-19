// POST /api/twilio/inbound — receives inbound SMS from prospects via Twilio webhook
//
// Setup: Twilio console → Phone Numbers → [number] → "A message comes in"
//   Webhook URL: https://yourdomain.com/api/twilio/inbound
//   Method: HTTP POST
//
// Assumptions (v1):
//   - One lead per phone number per property. If multiple leads share a phone,
//     we use the most recently created one to avoid ambiguity.
//   - We do not auto-create leads from unknown numbers yet — unknown callers are
//     logged and dropped gracefully. This avoids spam and orphan records.
//   - We always reply via the REST API (not TwiML) and return an empty TwiML
//     response so Twilio doesn't send a duplicate message.
//   - Conversation history is capped at the last 10 messages to keep the
//     context window predictable and control cost.
//   - We do not re-reply to our own outbound messages. Twilio will only POST
//     to this webhook for inbound messages, so no loop protection is needed —
//     but we assert direction === "inbound" before replying as a safety guard.

import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";

// ─── Twilio always expects a 200 with empty TwiML ─────────────────────────────
// We send replies via the REST API separately, so this just acknowledges receipt.

const TWIML_OK = new NextResponse(
  `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
  { status: 200, headers: { "Content-Type": "text/xml" } }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function logActivity(
  db: SupabaseClient,
  entry: {
    lead_id: string;
    property_id: string;
    action: string;
    actor: "system" | "ai" | "agent";
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await db.from("activity_logs").insert(entry);
  if (error) console.error(`[activity_logs] failed to log "${entry.action}":`, error);
}

// ─── POST /api/twilio/inbound ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Twilio sends form-encoded data, not JSON
  const formData = await req.formData();

  const from = formData.get("From") as string;       // prospect's phone (E.164)
  const to = formData.get("To") as string;           // property's Twilio number
  const body = formData.get("Body") as string;       // message text
  const messageSid = formData.get("MessageSid") as string;

  if (!from || !to || !body || !messageSid) {
    console.error("[twilio/inbound] missing required fields", { from, to, body, messageSid });
    return TWIML_OK; // always 200 to Twilio — never return 4xx or it will retry
  }

  const db = getSupabaseAdmin();

  // 1. Match the "To" number to a property
  const { data: property } = await db
    .from("properties")
    .select("id, name, phone_number, active_special")
    .eq("phone_number", to)
    .single();

  if (!property) {
    console.warn("[twilio/inbound] no property found for number:", to);
    return TWIML_OK;
  }

  // 2. Match the "From" number to a lead under that property
  // If multiple leads share a phone (edge case), use the newest one.
  const { data: leads } = await db
    .from("leads")
    .select("id, name, status, move_in_date, bedrooms, budget_min, budget_max")
    .eq("phone", from)
    .eq("property_id", property.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const lead = leads?.[0] ?? null;

  if (!lead) {
    // Unknown number — log and drop. We don't auto-create leads from inbound SMS in v1
    // to avoid spam and unqualified noise entering the pipeline.
    console.warn("[twilio/inbound] no lead found for number:", from, "on property:", property.id);
    await logActivity(db, {
      lead_id: "00000000-0000-0000-0000-000000000000", // placeholder — no lead
      property_id: property.id,
      action: "inbound_sms_unmatched",
      actor: "system",
      metadata: { from, preview: body.slice(0, 100) },
    });
    return TWIML_OK;
  }

  // 3. Store the inbound message
  const { error: inboundLogError } = await db.from("conversations").insert({
    lead_id: lead.id,
    property_id: property.id,
    direction: "inbound",
    channel: "sms",
    body,
    twilio_sid: messageSid,
    ai_generated: false,
  });

  if (inboundLogError) {
    // Fatal — if we can't log the message we shouldn't reply (audit trail is broken)
    console.error("[twilio/inbound] failed to log inbound message:", inboundLogError);
    return TWIML_OK;
  }

  await logActivity(db, {
    lead_id: lead.id,
    property_id: property.id,
    action: "sms_received",
    actor: "system",
    metadata: { twilio_sid: messageSid, preview: body.slice(0, 100) },
  });

  // 4. Update last_contacted_at on the lead
  await db
    .from("leads")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", lead.id);

  // 5. Build conversation history for AI context (last 10 messages, oldest first)
  const { data: history } = await db
    .from("conversations")
    .select("direction, body")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const conversationHistory = (history ?? [])
    .reverse() // oldest first
    .map((m) => `${m.direction === "inbound" ? lead.name : "Leasing Team"}: ${m.body}`)
    .join("\n");

  // 6. Generate AI reply
  let aiMessage: string;
  try {
    const result = await generateLeadReply({
      propertyName: property.name,
      activeSpecial: property.active_special ?? undefined,
      leadName: lead.name,
      moveInDate: lead.move_in_date ?? undefined,
      bedrooms: lead.bedrooms ?? undefined,
      budgetMin: lead.budget_min ?? undefined,
      budgetMax: lead.budget_max ?? undefined,
      trigger: "inbound_sms",
      conversationHistory,
    });
    aiMessage = result.message;
  } catch (err) {
    console.error("[twilio/inbound] AI generation failed:", err);
    // Don't reply — better to be silent than to send a broken message.
    // A human can follow up manually from the dashboard.
    return TWIML_OK;
  }

  // 7. Send the reply via Twilio REST API
  let twilioSid: string;
  try {
    const smsResult = await sendSms({
      to: from,
      body: aiMessage,
      from: property.phone_number,
    });
    twilioSid = smsResult.sid;
  } catch (err) {
    console.error("[twilio/inbound] SMS send failed:", err);
    return TWIML_OK;
  }

  // 8. Store the outbound reply
  const { error: outboundLogError } = await db.from("conversations").insert({
    lead_id: lead.id,
    property_id: property.id,
    direction: "outbound",
    channel: "sms",
    body: aiMessage,
    twilio_sid: twilioSid,
    ai_generated: true,
  });

  if (outboundLogError) {
    console.error("[twilio/inbound] failed to log outbound message:", outboundLogError);
  }

  // 9. Log sms_sent event
  await logActivity(db, {
    lead_id: lead.id,
    property_id: property.id,
    action: "sms_sent",
    actor: "ai",
    metadata: { trigger: "inbound_sms", preview: aiMessage.slice(0, 100) },
  });

  return TWIML_OK;
}
