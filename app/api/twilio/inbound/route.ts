// POST /api/twilio/inbound — receives inbound SMS from prospects via Twilio webhook
//
// Setup: Twilio console → Phone Numbers → [number] → "A message comes in"
//   Webhook URL: https://yourdomain.com/api/twilio/inbound   Method: HTTP POST
//
// Processing order (each step can short-circuit and return TWIML_OK):
//   1. Parse + validate Twilio form data
//   2. Match To → property, From → lead
//   3. Check idempotency (duplicate MessageSid)
//   4. Opt-out detection (TCPA) — if opt-out, mark lead and stop
//   5. Store inbound message
//   6. Check stop conditions (human_takeover, ai_paused, lead status)
//   7. Escalation detection → create handoff if triggered
//   8. Generate AI reply (with property context injected)
//   9. Send reply via Twilio REST
//   10. Store outbound message, update lead, queue next follow-up check

import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";
import { isOptOut, cancelFollowUps, evaluateNextAction } from "@/lib/follow-up";
import { detectEscalation, createHandoffEvent } from "@/lib/human-takeover";
import { getPropertyAIContext, formatPropertyAIContext } from "@/lib/property-ai-context";
import { setFirstContactDate } from "@/lib/billing";

const TWIML_OK = new NextResponse(
  `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
  { status: 200, headers: { "Content-Type": "text/xml" } }
);

const OPT_OUT_REPLY =
  "You have been unsubscribed and will no longer receive messages from us. Reply START to re-subscribe.";

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

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from      = formData.get("From") as string;
  const to        = formData.get("To") as string;
  const body      = formData.get("Body") as string;
  const messageSid = formData.get("MessageSid") as string;

  if (!from || !to || !body || !messageSid) {
    console.error("[twilio/inbound] missing required fields", { from, to, body, messageSid });
    return TWIML_OK;
  }

  const db = getSupabaseAdmin();

  // ── 1. Match To → property ────────────────────────────────────────────────
  const { data: property } = await db
    .from("properties")
    .select("id, name, phone_number, active_special, notify_email, timezone")
    .eq("phone_number", to)
    .single();

  if (!property) {
    console.warn("[twilio/inbound] no property found for number:", to);
    return TWIML_OK;
  }

  // ── 2. Match From → lead ──────────────────────────────────────────────────
  const { data: leads } = await db
    .from("leads")
    .select("id, name, status, opt_out, human_takeover, ai_paused, move_in_date, bedrooms, budget_min, budget_max")
    .eq("phone", from)
    .eq("property_id", property.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const lead = leads?.[0] ?? null;

  if (!lead) {
    console.warn("[twilio/inbound] unknown number:", from, "on property:", property.id);
    await logActivity(db, {
      lead_id:     "00000000-0000-0000-0000-000000000000",
      property_id: property.id,
      action:      "inbound_sms_unmatched",
      actor:       "system",
      metadata:    { from, preview: body.slice(0, 100) },
    });
    return TWIML_OK;
  }

  // ── 3. Idempotency — skip if we've already processed this MessageSid ──────
  const { data: existing } = await db
    .from("conversations")
    .select("id")
    .eq("twilio_sid", messageSid)
    .limit(1);

  if (existing?.length) {
    console.warn("[twilio/inbound] duplicate MessageSid, skipping:", messageSid);
    return TWIML_OK;
  }

  // ── 4. Opt-out detection (TCPA — must handle before anything else) ────────
  if (isOptOut(body)) {
    await db.from("leads").update({
      opt_out:    true,
      opt_out_at: new Date().toISOString(),
    }).eq("id", lead.id);

    await cancelFollowUps(lead.id, "opted_out");

    // Log the inbound opt-out message
    await db.from("conversations").insert({
      lead_id:      lead.id,
      property_id:  property.id,
      direction:    "inbound",
      channel:      "sms",
      body,
      twilio_sid:   messageSid,
      ai_generated: false,
    });

    // Send mandatory opt-out confirmation
    try {
      await sendSms({ to: from, body: OPT_OUT_REPLY, from: property.phone_number });
    } catch (err) {
      console.error("[twilio/inbound] failed to send opt-out reply:", err);
    }

    await logActivity(db, {
      lead_id:     lead.id,
      property_id: property.id,
      action:      "lead_opted_out",
      actor:       "system",
      metadata:    { preview: body.slice(0, 100) },
    });

    return TWIML_OK;
  }

  // ── 5. Store inbound message ───────────────────────────────────────────────
  const { error: inboundErr } = await db.from("conversations").insert({
    lead_id:      lead.id,
    property_id:  property.id,
    direction:    "inbound",
    channel:      "sms",
    body,
    twilio_sid:   messageSid,
    ai_generated: false,
  });

  if (inboundErr) {
    console.error("[twilio/inbound] failed to log inbound message:", inboundErr);
    return TWIML_OK;
  }

  await logActivity(db, {
    lead_id:     lead.id,
    property_id: property.id,
    action:      "sms_received",
    actor:       "system",
    metadata:    { twilio_sid: messageSid, preview: body.slice(0, 100) },
  });

  // Update lead engagement status
  if (lead.status === "new" || lead.status === "contacted") {
    await db.from("leads").update({
      status:            "engaged",
      last_contacted_at: new Date().toISOString(),
    }).eq("id", lead.id);
  } else {
    await db.from("leads").update({
      last_contacted_at: new Date().toISOString(),
    }).eq("id", lead.id);
  }

  // This was a reply — cancel any pending scheduled follow-ups
  await evaluateNextAction(lead.id, property.id, "inbound_reply");

  // ── 6. Check stop conditions ──────────────────────────────────────────────
  if (lead.opt_out) return TWIML_OK; // already handled above but safety guard
  if (lead.human_takeover) {
    console.log("[twilio/inbound] human takeover active for lead:", lead.id);
    return TWIML_OK;
  }
  if (lead.ai_paused) {
    console.log("[twilio/inbound] AI paused for lead:", lead.id);
    return TWIML_OK;
  }
  if (lead.status === "won" || lead.status === "lost") return TWIML_OK;

  // ── 7. Escalation detection ───────────────────────────────────────────────
  const aiConfig = await getPropertyAIContext(property.id);
  const escalationResult = await detectEscalation(
    body,
    aiConfig?.escalation_triggers ?? []
  );

  if (escalationResult.shouldEscalate && escalationResult.reason) {
    try {
      await createHandoffEvent(lead.id, property.id, escalationResult.reason, body, "ai");
    } catch (err) {
      console.error("[twilio/inbound] failed to create handoff:", err);
    }
    return TWIML_OK; // AI does not reply — human takes over
  }

  // ── 8. Build conversation history ─────────────────────────────────────────
  const { data: history } = await db
    .from("conversations")
    .select("direction, body")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const conversationHistory = (history ?? [])
    .reverse()
    .map((m: { direction: string; body: string }) =>
      `${m.direction === "inbound" ? lead.name : "Leasing Team"}: ${m.body}`)
    .join("\n");

  const propertyContext = aiConfig ? formatPropertyAIContext(aiConfig) : undefined;

  // ── 9. Generate AI reply ──────────────────────────────────────────────────
  let aiMessage: string;
  try {
    const result = await generateLeadReply({
      propertyName:        property.name,
      activeSpecial:       property.active_special ?? undefined,
      leadName:            lead.name,
      moveInDate:          lead.move_in_date ?? undefined,
      bedrooms:            lead.bedrooms ?? undefined,
      budgetMin:           lead.budget_min ?? undefined,
      budgetMax:           lead.budget_max ?? undefined,
      trigger:             "inbound_sms",
      conversationHistory,
      propertyContext,
    });
    aiMessage = result.message;
  } catch (err) {
    console.error("[twilio/inbound] AI generation failed:", err);
    return TWIML_OK;
  }

  // ── 10. Send reply ────────────────────────────────────────────────────────
  let twilioSid: string;
  try {
    const smsResult = await sendSms({ to: from, body: aiMessage, from: property.phone_number });
    twilioSid = smsResult.sid;
  } catch (err) {
    console.error("[twilio/inbound] SMS send failed:", err);
    return TWIML_OK;
  }

  // ── 11. Store outbound + update lead ──────────────────────────────────────
  await db.from("conversations").insert({
    lead_id:      lead.id,
    property_id:  property.id,
    direction:    "outbound",
    channel:      "sms",
    body:         aiMessage,
    twilio_sid:   twilioSid,
    ai_generated: true,
  });

  // Set first_contact_date if not already set (e.g. lead was created manually)
  await setFirstContactDate(lead.id);

  await logActivity(db, {
    lead_id:     lead.id,
    property_id: property.id,
    action:      "sms_sent",
    actor:       "ai",
    metadata:    { trigger: "inbound_sms", preview: aiMessage.slice(0, 100) },
  });

  return TWIML_OK;
}
