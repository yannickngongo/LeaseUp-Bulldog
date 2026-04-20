// Explain-Why Engine — generate plain-English reasoning for any LUB recommendation or action.

import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";

const MODEL = "claude-haiku-4-5-20251001";

let _client: Anthropic | null = null;
function ai(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export interface Explanation {
  headline: string;
  reasoning: string;
  keySignals: string[];
  confidence: "low" | "medium" | "high";
}

export interface ReasoningInput {
  context: string;         // what type of thing we're explaining
  recommendation: string;  // what we recommended/did
  signals: Record<string, unknown>; // the data signals that drove it
}

// ── buildReasoningSummary ─────────────────────────────────────────────────────

export async function buildReasoningSummary(input: ReasoningInput): Promise<Explanation> {
  const signalText = Object.entries(input.signals)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const response = await ai().messages.create({
    model:      MODEL,
    max_tokens: 400,
    system: `You explain AI decisions in plain English for apartment operators. Be honest, specific, and avoid hallucinating.
Return ONLY valid JSON:
{
  "headline": "One sentence (max 70 chars) — why this was recommended",
  "reasoning": "2-3 sentence explanation grounded in the signals provided",
  "keySignals": ["signal 1", "signal 2", "signal 3"],
  "confidence": "low" | "medium" | "high"
}`,
    messages: [{
      role:    "user",
      content: `Context: ${input.context}
Recommendation: ${input.recommendation}
Data signals:
${signalText}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(text) as Explanation;
  } catch {
    return {
      headline:   "Recommendation based on system data",
      reasoning:  "This recommendation was generated from property performance signals.",
      keySignals: [],
      confidence: "low",
    };
  }
}

// ── explainRecommendation ─────────────────────────────────────────────────────
// Look up a recommendation by ID and explain it.

export async function explainRecommendation(
  recommendationType: "orchestration_action" | "offer_recommendation" | "insight" | "intervention",
  id: string
): Promise<Explanation> {
  const db = getSupabaseAdmin();

  if (recommendationType === "orchestration_action") {
    const { data } = await db.from("orchestration_actions").select("*").eq("id", id).single();
    if (!data) throw new Error("Action not found");
    return buildReasoningSummary({
      context:        "orchestration action recommendation",
      recommendation: data.title,
      signals:        { reasoning: data.reasoning, risk_level: data.risk_level, action_type: data.action_type },
    });
  }

  if (recommendationType === "offer_recommendation") {
    const { data } = await db.from("offer_recommendations").select("*, offer_lab_runs(special_offer, target_renter)").eq("id", id).single();
    if (!data) throw new Error("Offer recommendation not found");
    return buildReasoningSummary({
      context:        "offer improvement recommendation",
      recommendation: data.improved_special,
      signals:        {
        original_offer:   (data.offer_lab_runs as Record<string, unknown>)?.special_offer,
        target_renter:    (data.offer_lab_runs as Record<string, unknown>)?.target_renter,
        reasoning:        data.reasoning,
      },
    });
  }

  if (recommendationType === "insight") {
    const { data } = await db.from("insights").select("*").eq("id", id).single();
    if (!data) throw new Error("Insight not found");
    return buildReasoningSummary({
      context:        `strategic insight (${data.category})`,
      recommendation: data.recommended_action,
      signals:        { title: data.title, explanation: data.explanation, impact_level: data.impact_level },
    });
  }

  if (recommendationType === "intervention") {
    const { data } = await db.from("intervention_events").select("*").eq("id", id).single();
    if (!data) throw new Error("Intervention not found");
    return buildReasoningSummary({
      context:        "vacancy intervention trigger",
      recommendation: "Intervention mode activated",
      signals:        { trigger_reason: data.trigger_reason, risk_score: data.risk_score },
    });
  }

  throw new Error(`Unknown recommendation type: ${recommendationType}`);
}
