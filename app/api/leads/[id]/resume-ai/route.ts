// POST /api/leads/[id]/resume-ai
// Operator clicks "Resume AI" on a lead under human takeover. We clear the
// human_takeover + ai_paused flags, then fire one AI message that re-opens
// the conversation contextually so the lead doesn't fall into silence.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";
import { getPropertyAIContext, formatPropertyAIContext } from "@/lib/property-ai-context";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseAdmin();

  // Load lead + property, validate ownership
  const { data: lead } = await db
    .from("leads")
    .select("*, properties(id, name, phone_number, operator_id, address, city, state, zip, active_special, tour_booking_url, notify_email, timezone)")
    .eq("id", id)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const property = (lead as Record<string, unknown>).properties as Record<string, unknown> | null;
  if (!property || property.operator_id !== ctx.operatorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Clear takeover/pause flags
  await db
    .from("leads")
    .update({ human_takeover: false, ai_paused: false })
    .eq("id", id);

  // Build conversation history (last 10) so the AI can pick up contextually
  const { data: history } = await db
    .from("conversations")
    .select("direction, body")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const conversationHistory = (history ?? [])
    .reverse()
    .map((m: { direction: string; body: string }) =>
      `${m.direction === "inbound" ? lead.name : "Leasing Team"}: ${m.body}`)
    .join("\n");

  const aiConfig = await getPropertyAIContext(property.id as string);
  const propertyContext = aiConfig ? formatPropertyAIContext(aiConfig) : undefined;

  // Generate the resume message
  let aiMessage: string;
  try {
    const addressParts = [property.address, property.city, property.state, property.zip].filter(Boolean);
    const result = await generateLeadReply({
      propertyName:        property.name as string,
      propertyAddress:     addressParts.length ? addressParts.join(", ") : undefined,
      activeSpecial:       (property.active_special as string | null) ?? undefined,
      tourBookingUrl:      (property.tour_booking_url as string | null) ?? undefined,
      leadName:            lead.name,
      leadEmail:           lead.email ?? undefined,
      moveInDate:          lead.move_in_date ?? undefined,
      bedrooms:            lead.bedrooms ?? undefined,
      budgetMin:           lead.budget_min ?? undefined,
      budgetMax:           lead.budget_max ?? undefined,
      trigger:             "follow_up",
      conversationHistory,
      propertyContext,
    });
    aiMessage = result.message;
  } catch (err) {
    console.error("[resume-ai] generation failed:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }

  // Send via Twilio (fire-and-forget on Twilio errors so the takeover still gets cleared)
  let twilioSid: string | undefined;
  try {
    const sms = await sendSms({
      to:   lead.phone,
      body: aiMessage,
      from: property.phone_number as string,
    });
    twilioSid = sms.sid;
  } catch (err) {
    console.error("[resume-ai] SMS send failed:", err);
  }

  // Persist the outbound message
  await db.from("conversations").insert({
    lead_id:      id,
    property_id:  property.id,
    direction:    "outbound",
    channel:      "sms",
    body:         aiMessage,
    twilio_sid:   twilioSid ?? null,
    ai_generated: true,
  });

  await db.from("leads")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", id);

  await db.from("activity_logs").insert({
    lead_id:     id,
    property_id: property.id,
    action:      "ai_resumed",
    actor:       "agent",
    metadata:    { resumed_by: ctx.email, preview: aiMessage.slice(0, 100) },
  });

  return NextResponse.json({ ok: true, message: aiMessage });
}
