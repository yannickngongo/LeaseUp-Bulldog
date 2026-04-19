// POST /api/ai/respond — generate and send an AI SMS response to a lead
// Triggers: new_lead | inbound_sms | follow_up

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";
import { getPropertyAIContext, formatPropertyAIContext } from "@/lib/property-ai-context";
import { setFirstContactDate } from "@/lib/billing";
import type { AIRespondPayload } from "@/lib/types";

const AIRespondSchema = z.object({
  lead_id:     z.string().uuid(),
  property_id: z.string().uuid(),
  trigger:     z.enum(["new_lead", "inbound_sms", "follow_up"]),
}) satisfies z.ZodType<AIRespondPayload>;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = AIRespondSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { lead_id, property_id, trigger } = parsed.data;
  const db = getSupabaseAdmin();

  const { data: lead, error: leadErr } = await db
    .from("leads")
    .select("*")
    .eq("id", lead_id)
    .single();
  if (leadErr || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Respect stop conditions
  if (lead.opt_out)        return NextResponse.json({ error: "Lead opted out" }, { status: 422 });
  if (lead.human_takeover) return NextResponse.json({ error: "Human takeover active" }, { status: 422 });
  if (lead.ai_paused)      return NextResponse.json({ error: "AI paused for this lead" }, { status: 422 });

  const { data: property, error: propErr } = await db
    .from("properties")
    .select("*")
    .eq("id", property_id)
    .single();
  if (propErr || !property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const [historyResult, aiConfigResult] = await Promise.all([
    db.from("conversations")
      .select("direction, body")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: true })
      .limit(10),
    getPropertyAIContext(property_id),
  ]);

  const conversationHistory = (historyResult.data ?? [])
    .map((m: { direction: string; body: string }) =>
      `${m.direction === "inbound" ? lead.name : "Leasing Team"}: ${m.body}`)
    .join("\n");

  const propertyContext = aiConfigResult
    ? formatPropertyAIContext(aiConfigResult)
    : undefined;

  const reply = await generateLeadReply({
    propertyName:        property.name,
    activeSpecial:       property.active_special ?? undefined,
    leadName:            lead.name,
    moveInDate:          lead.move_in_date ?? undefined,
    bedrooms:            lead.bedrooms ?? undefined,
    budgetMin:           lead.budget_min ?? undefined,
    budgetMax:           lead.budget_max ?? undefined,
    trigger,
    conversationHistory,
    propertyContext,
  });

  const twilioResult = await sendSms({
    to:   lead.phone,
    body: reply.message,
    from: property.phone_number,
  });

  await db.from("conversations").insert({
    lead_id,
    property_id,
    direction:    "outbound",
    channel:      "sms",
    body:         reply.message,
    twilio_sid:   twilioResult?.sid ?? null,
    ai_generated: true,
  });

  // Set first contact date on new_lead trigger
  if (trigger === "new_lead") {
    await setFirstContactDate(lead_id);
    await db.from("leads").update({ status: "contacted" }).eq("id", lead_id);
  }

  await db.from("leads")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", lead_id);

  await db.from("activity_logs").insert({
    lead_id,
    property_id,
    action:   `ai_reply_sent:${trigger}`,
    actor:    "ai",
    metadata: {
      model:         reply.model,
      input_tokens:  reply.inputTokens,
      output_tokens: reply.outputTokens,
    },
  });

  return NextResponse.json({ ok: true, message: reply.message });
}
