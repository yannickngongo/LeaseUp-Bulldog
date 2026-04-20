// Lead Intelligence — classify leads by intent, urgency, and conversion likelihood.
// Integrates with follow-up system to adjust cadence based on quality.

import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { cancelFollowUps, queueFollowUp } from "@/lib/follow-up";

const MODEL = "claude-haiku-4-5-20251001";

let _client: Anthropic | null = null;
function ai(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export interface LeadScore {
  intentScore: number;            // 0–100
  urgencyLevel: "low" | "medium" | "high";
  priceSensitivity: "low" | "medium" | "high";
  likelihoodToApply: number;      // 0–1
  likelihoodToLease: number;      // 0–1
  followUpRecommendation: "aggressive" | "normal" | "nurture";
  reasoning: string;
}

// ── evaluateLeadQuality ───────────────────────────────────────────────────────

export async function evaluateLeadQuality(leadId: string): Promise<LeadScore> {
  const db = getSupabaseAdmin();

  // Load lead + conversation history
  const [{ data: lead }, { data: messages }] = await Promise.all([
    db.from("leads").select("*").eq("id", leadId).single(),
    db.from("conversations")
      .select("direction, body, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true })
      .limit(20),
  ]);

  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  const conversationText = (messages ?? [])
    .map(m => `${m.direction === "inbound" ? "Lead" : "Agent"}: ${m.body}`)
    .join("\n");

  // Calculate engagement signals
  const inboundMessages = (messages ?? []).filter(m => m.direction === "inbound");
  const responseCount = inboundMessages.length;
  const lastInbound = inboundMessages[inboundMessages.length - 1];
  const hoursSinceLastReply = lastInbound
    ? (Date.now() - new Date(lastInbound.created_at).getTime()) / 3600000
    : 999;

  const response = await ai().messages.create({
    model:      MODEL,
    max_tokens: 500,
    system: `You are a lead quality analyst for apartment leasing. Score this lead based on their conversation.
Return ONLY valid JSON:
{
  "intentScore": number,
  "urgencyLevel": "low" | "medium" | "high",
  "priceSensitivity": "low" | "medium" | "high",
  "likelihoodToApply": number,
  "likelihoodToLease": number,
  "followUpRecommendation": "aggressive" | "normal" | "nurture",
  "reasoning": "1-2 sentences"
}

intentScore: 0-100 (how clearly are they looking to move?)
likelihoodToApply: 0-1
likelihoodToLease: 0-1
aggressive = respond quickly, follow up often; nurture = light touch, less frequent`,
    messages: [{
      role:    "user",
      content: `Lead status: ${lead.status}
Move-in date: ${lead.move_in_date ?? "not stated"}
Budget: ${lead.budget_min ? `$${lead.budget_min}–$${lead.budget_max}` : "not stated"}
Bedrooms: ${lead.bedrooms ?? "not stated"}
Inbound messages: ${responseCount}
Hours since last reply: ${hoursSinceLastReply.toFixed(0)}
Conversation:\n${conversationText || "(no messages yet)"}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  let score: LeadScore;
  try {
    score = JSON.parse(text) as LeadScore;
  } catch {
    score = {
      intentScore: 40, urgencyLevel: "medium", priceSensitivity: "medium",
      likelihoodToApply: 0.3, likelihoodToLease: 0.2,
      followUpRecommendation: "normal", reasoning: "Unable to score at this time.",
    };
  }

  // Upsert into lead_scores
  await db.from("lead_scores").upsert({
    lead_id:                  leadId,
    intent_score:             score.intentScore,
    urgency_level:            score.urgencyLevel,
    price_sensitivity:        score.priceSensitivity,
    likelihood_to_apply:      score.likelihoodToApply,
    likelihood_to_lease:      score.likelihoodToLease,
    follow_up_recommendation: score.followUpRecommendation,
    reasoning:                score.reasoning,
    scored_at:                new Date().toISOString(),
  }, { onConflict: "lead_id" });

  // Adjust follow-up cadence based on quality
  await adjustFollowUpCadence(leadId, lead.property_id, score);

  return score;
}

// ── adjustFollowUpCadence ────────────────────────────────────────────────────

async function adjustFollowUpCadence(
  leadId: string,
  propertyId: string,
  score: LeadScore
): Promise<void> {
  if (score.followUpRecommendation === "aggressive" && score.urgencyLevel === "high") {
    // Cancel existing pending tasks and re-queue with tighter timing
    await cancelFollowUps(leadId, "manual_pause");
    const soon = new Date(Date.now() + 3 * 3600000); // 3 hours
    await queueFollowUp(leadId, propertyId, "follow_up_1", soon, 1);
  }
  // nurture and normal: leave existing cadence unchanged
}

// ── batchEvaluateLeads ────────────────────────────────────────────────────────

export async function batchEvaluateLeads(propertyId: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { data: leads } = await db
    .from("leads")
    .select("id")
    .eq("property_id", propertyId)
    .in("status", ["new", "contacted", "engaged"])
    .limit(50);

  for (const lead of leads ?? []) {
    try {
      await evaluateLeadQuality(lead.id);
    } catch {
      // Non-fatal: continue scoring other leads
    }
  }
}
