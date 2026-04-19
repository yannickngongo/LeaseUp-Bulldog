// POST /api/ai/respond — generate and send an AI SMS response to a lead
//
// Called internally after:
//   - A new lead is created (trigger: "new_lead")
//   - An inbound SMS arrives (trigger: "inbound_sms")
//   - A scheduled follow-up fires (trigger: "follow_up")
//
// Flow:
//   1. Load lead + property + conversation history from Supabase
//   2. Load the prompt template from prompts/lead-qualification.md
//   3. Call Claude to generate a response
//   4. Send the message via Twilio
//   5. Log the outbound message to conversations
//   6. Update lead status / follow_up_at as needed

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";
import type { AIRespondPayload } from "@/lib/types";

// ─── Validation ───────────────────────────────────────────────────────────────

const AIRespondSchema = z.object({
  lead_id: z.string().uuid(),
  property_id: z.string().uuid(),
  trigger: z.enum(["new_lead", "inbound_sms", "follow_up"]),
}) satisfies z.ZodType<AIRespondPayload>;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = AIRespondSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { lead_id, property_id, trigger } = parsed.data;
  const db = getSupabaseAdmin();

  // TODO: Load lead
  // const { data: lead } = await db.from("leads").select("*").eq("id", lead_id).single();
  // if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // TODO: Load property (needed for phone number and specials)
  // const { data: property } = await db.from("properties").select("*").eq("id", property_id).single();

  // TODO: Load conversation history (last 10 messages for context window efficiency)
  // const { data: history } = await db
  //   .from("conversations")
  //   .select("direction, body")
  //   .eq("lead_id", lead_id)
  //   .order("created_at", { ascending: false })
  //   .limit(10);

  // TODO: Build prompt using prompts/lead-qualification.md template + lead/property context

  // TODO: Call Claude
  // const client = getAnthropicClient();
  // const response = await client.messages.create({
  //   model: DEFAULT_MODEL,
  //   max_tokens: 300,
  //   messages: [{ role: "user", content: builtPrompt }],
  // });
  // const aiMessage = response.content[0].type === "text" ? response.content[0].text : "";

  // TODO: Send via Twilio using property's phone number
  // const twilioMsg = await sendSms(lead.phone, aiMessage, property.phone_number);

  // TODO: Log outbound message to conversations (ai_generated: true)
  // await db.from("conversations").insert({
  //   lead_id, property_id,
  //   direction: "outbound",
  //   channel: "sms",
  //   body: aiMessage,
  //   twilio_sid: twilioMsg.sid,
  //   ai_generated: true,
  // });

  // TODO: Update lead status + last_contacted_at

  console.log("[ai/respond] placeholder — trigger:", trigger, "lead:", lead_id);

  return NextResponse.json({ ok: true, message: "placeholder — not yet implemented" });
}
