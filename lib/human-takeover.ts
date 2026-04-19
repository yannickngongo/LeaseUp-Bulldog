// Human takeover / escalation system.
// Detects when the AI should stop and a human should take over.
// Uses pattern matching for speed + Claude Haiku for nuanced classification.

import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { cancelFollowUps } from "@/lib/follow-up";
import type { EscalationReason, HandoffEvent } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASSIFIER_MODEL = "claude-haiku-4-5-20251001";

// Hard-coded escalation patterns (no AI needed for these)
const HUMAN_REQUEST_PATTERNS = [
  /speak (to|with) (a |an )?(human|person|agent|someone|manager|rep)/i,
  /talk (to|with) (a |an )?(human|person|agent|someone|manager|rep)/i,
  /real person/i,
  /want (a |an )?(human|person|agent)/i,
  /connect me (to|with)/i,
  /transfer me/i,
  /call me/i,
];

const FRUSTRATION_PATTERNS = [
  /this is (ridiculous|insane|unacceptable|bs|bullshit|stupid)/i,
  /(very |really |so )?(frustrated|annoyed|angry|upset|fed up)/i,
  /terrible (service|experience)/i,
  /worst/i,
];

const POLICY_PATTERNS = [
  /lease (term|agreement|clause|break|penalty)/i,
  /eviction/i,
  /legal/i,
  /attorney|lawyer/i,
  /discrimination/i,
  /fair housing/i,
  /lawsuit|sue/i,
];

// ─── Pattern-based detection ──────────────────────────────────────────────────

function detectByPattern(
  message: string,
  propertyTriggers: string[] = []
): EscalationReason | null {
  if (HUMAN_REQUEST_PATTERNS.some(p => p.test(message))) return "asked_for_human";
  if (FRUSTRATION_PATTERNS.some(p => p.test(message))) return "frustration_detected";
  if (POLICY_PATTERNS.some(p => p.test(message))) return "policy_question";

  const lower = message.toLowerCase();
  if (propertyTriggers.some(t => lower.includes(t.toLowerCase()))) {
    return "escalation_trigger";
  }

  return null;
}

// ─── AI-based classification ──────────────────────────────────────────────────
// Used when patterns don't match but the message is ambiguous.

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey });
  return _client;
}

async function classifyWithAI(message: string): Promise<EscalationReason | null> {
  try {
    const client = getClient();
    const response = await client.messages.create({
      model:      CLASSIFIER_MODEL,
      max_tokens: 10,
      system: `You are a classifier for an apartment leasing SMS system.
Classify the following prospect message into one of these categories:
- ESCALATE_HUMAN: prospect explicitly wants a human
- ESCALATE_FRUSTRATED: prospect is clearly frustrated or angry
- ESCALATE_POLICY: prospect asking about legal, lease terms, policies beyond normal FAQ
- ESCALATE_TECHNICAL: complex technical question the AI can't answer
- NORMAL: normal leasing inquiry, AI can handle
Respond with ONLY the category name.`,
      messages: [{ role: "user", content: message }],
    });

    const text = response.content[0].type === "text"
      ? response.content[0].text.trim().toUpperCase()
      : "NORMAL";

    if (text.includes("HUMAN")) return "asked_for_human";
    if (text.includes("FRUSTRATED")) return "frustration_detected";
    if (text.includes("POLICY")) return "policy_question";
    if (text.includes("TECHNICAL")) return "technical_question";
    return null;
  } catch {
    // Classification failure is not fatal — default to not escalating
    return null;
  }
}

// ─── detectEscalation ────────────────────────────────────────────────────────
// Public entry point. Returns the reason if escalation is needed, else null.

export async function detectEscalation(
  message: string,
  propertyEscalationTriggers: string[] = []
): Promise<{ shouldEscalate: boolean; reason: EscalationReason | null }> {
  // Fast path: pattern match
  const patternReason = detectByPattern(message, propertyEscalationTriggers);
  if (patternReason) return { shouldEscalate: true, reason: patternReason };

  // Slow path: AI classification (only for messages over 10 chars — ignore very short messages)
  if (message.length > 10) {
    const aiReason = await classifyWithAI(message);
    if (aiReason) return { shouldEscalate: true, reason: aiReason };
  }

  return { shouldEscalate: false, reason: null };
}

// ─── createHandoffEvent ───────────────────────────────────────────────────────
// Creates a handoff_event row, marks the lead as human_takeover, cancels follow-ups.

export async function createHandoffEvent(
  leadId: string,
  propertyId: string,
  reason: EscalationReason,
  triggerMessage: string,
  triggeredBy: "ai" | "system" | "manual" = "ai"
): Promise<HandoffEvent> {
  const db = getSupabaseAdmin();

  // Mark lead as human takeover
  await db
    .from("leads")
    .update({ human_takeover: true })
    .eq("id", leadId);

  // Cancel all pending follow-up tasks
  await cancelFollowUps(leadId, "human_takeover");

  // Get property's notification email for assignment
  const { data: property } = await db
    .from("properties")
    .select("notify_email, operator_id")
    .eq("id", propertyId)
    .single();

  const { data: handoff, error } = await db
    .from("handoff_events")
    .insert({
      lead_id:         leadId,
      property_id:     propertyId,
      reason,
      trigger_message: triggerMessage.slice(0, 500), // cap length
      triggered_by:    triggeredBy,
      assigned_to:     property?.notify_email ?? null,
      assigned_at:     property?.notify_email ? new Date().toISOString() : null,
      status:          "open",
    })
    .select()
    .single();

  if (error || !handoff) throw new Error(`Failed to create handoff: ${error?.message}`);

  await db.from("activity_logs").insert({
    lead_id:     leadId,
    property_id: propertyId,
    action:      "human_takeover_initiated",
    actor:       "system",
    metadata:    { reason, triggered_by: triggeredBy, handoff_id: handoff.id },
  });

  return handoff as HandoffEvent;
}

// ─── resolveHandoff ───────────────────────────────────────────────────────────

export async function resolveHandoff(
  handoffId: string,
  resolutionNotes?: string
): Promise<void> {
  const db = getSupabaseAdmin();
  await db
    .from("handoff_events")
    .update({
      status:           "resolved",
      resolved_at:      new Date().toISOString(),
      resolution_notes: resolutionNotes ?? null,
    })
    .eq("id", handoffId);
}

// ─── returnToAI ───────────────────────────────────────────────────────────────
// Clears human_takeover on the lead so the AI resumes responding.

export async function returnToAI(
  handoffId: string,
  leadId: string
): Promise<void> {
  const db = getSupabaseAdmin();

  await Promise.all([
    db.from("handoff_events").update({
      status:      "returned_to_ai",
      resolved_at: new Date().toISOString(),
    }).eq("id", handoffId),

    db.from("leads").update({ human_takeover: false }).eq("id", leadId),
  ]);

  await db.from("activity_logs").insert({
    lead_id:  leadId,
    action:   "ai_control_returned",
    actor:    "system",
    metadata: { handoff_id: handoffId },
  });
}

// ─── getOpenHandoffs ──────────────────────────────────────────────────────────

export async function getOpenHandoffs(propertyId: string) {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("handoff_events")
    .select("*, leads(name, phone, status)")
    .eq("property_id", propertyId)
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false });

  return data ?? [];
}
