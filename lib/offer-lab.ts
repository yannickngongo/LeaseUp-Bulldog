// Offer Lab — AI evaluation, recommendation, and simulation of leasing offers.

import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function ai(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export interface OfferLabInput {
  propertyId: string;
  operatorId: string;
  campaignName?: string;
  specialOffer: string;
  targetRenter?: string;
  budgetCents?: number;
  campaignGoal?: string;
  selectedImages?: string[];
}

export interface OfferScores {
  offerStrength: number;
  marketCompetitiveness: number;
  leadAttraction: number;
  conversionPotential: number;
  overall: number;
  explanation: string;
}

export interface OfferRecommendation {
  improvedSpecial: string;
  improvedMessagingAngle: string;
  suggestedPositioning: string;
  reasoning: string;
}

export interface OfferSimulation {
  userVersion: {
    expectedLeadIncreasePct: number;
    expectedApplicationRatePct: number;
    expectedLeaseConversionPct: number;
    estimatedOccupancyImpact: number;
  };
  aiVersion: {
    expectedLeadIncreasePct: number;
    expectedApplicationRatePct: number;
    expectedLeaseConversionPct: number;
    estimatedOccupancyImpact: number;
  };
  confidenceScore: number;
  comparisonSummary: string;
}

// ── analyzeOffer ─────────────────────────────────────────────────────────────

export async function analyzeOffer(input: OfferLabInput): Promise<{
  runId: string;
  scores: OfferScores;
  recommendation: OfferRecommendation;
  simulation: OfferSimulation;
}> {
  const db = getSupabaseAdmin();

  // 1. Create run record
  const { data: run, error: runErr } = await db
    .from("offer_lab_runs")
    .insert({
      property_id:     input.propertyId,
      operator_id:     input.operatorId,
      campaign_name:   input.campaignName ?? null,
      special_offer:   input.specialOffer,
      target_renter:   input.targetRenter ?? null,
      budget_cents:    input.budgetCents ?? null,
      campaign_goal:   input.campaignGoal ?? null,
      selected_images: input.selectedImages ?? [],
      status:          "pending",
    })
    .select("id")
    .single();

  if (runErr || !run) throw new Error(`Failed to create offer lab run: ${runErr?.message}`);

  const runId = run.id;

  try {
    const [scores, recommendation] = await Promise.all([
      scoreOffer(input),
      generateOfferRecommendation(input),
    ]);

    const simulation = await simulateCampaignOutcome(input, recommendation);

    // 2. Persist scores
    await db.from("offer_scores").insert({
      run_id:                       runId,
      offer_strength_score:         scores.offerStrength,
      market_competitiveness_score: scores.marketCompetitiveness,
      lead_attraction_score:        scores.leadAttraction,
      conversion_potential_score:   scores.conversionPotential,
      overall_score:                scores.overall,
      explanation:                  scores.explanation,
    });

    // 3. Persist recommendation
    await db.from("offer_recommendations").insert({
      run_id:                   runId,
      improved_special:         recommendation.improvedSpecial,
      improved_messaging_angle: recommendation.improvedMessagingAngle,
      suggested_positioning:    recommendation.suggestedPositioning,
      reasoning:                recommendation.reasoning,
    });

    // 4. Persist simulation
    await db.from("offer_simulations").insert({
      run_id:                              runId,
      user_expected_lead_increase_pct:     simulation.userVersion.expectedLeadIncreasePct,
      user_expected_application_rate_pct:  simulation.userVersion.expectedApplicationRatePct,
      user_expected_lease_conversion_pct:  simulation.userVersion.expectedLeaseConversionPct,
      user_estimated_occupancy_impact:     simulation.userVersion.estimatedOccupancyImpact,
      ai_expected_lead_increase_pct:       simulation.aiVersion.expectedLeadIncreasePct,
      ai_expected_application_rate_pct:    simulation.aiVersion.expectedApplicationRatePct,
      ai_expected_lease_conversion_pct:    simulation.aiVersion.expectedLeaseConversionPct,
      ai_estimated_occupancy_impact:       simulation.aiVersion.estimatedOccupancyImpact,
      confidence_score:                    simulation.confidenceScore,
      comparison_summary:                  simulation.comparisonSummary,
    });

    await db.from("offer_lab_runs").update({ status: "completed" }).eq("id", runId);

    return { runId, scores, recommendation, simulation };
  } catch (err) {
    await db.from("offer_lab_runs").update({ status: "failed" }).eq("id", runId);
    throw err;
  }
}

// ── scoreOffer ────────────────────────────────────────────────────────────────

async function scoreOffer(input: OfferLabInput): Promise<OfferScores> {
  const response = await ai().messages.create({
    model:      MODEL,
    max_tokens: 600,
    system: `You are a real estate marketing analyst. Score a leasing special offer across 4 dimensions (0–100 each).
Return ONLY valid JSON — no markdown, no explanation outside JSON:
{
  "offerStrength": number,
  "marketCompetitiveness": number,
  "leadAttraction": number,
  "conversionPotential": number,
  "overall": number,
  "explanation": "2-3 sentence plain-English explanation of the scores"
}

Scoring guide:
- offerStrength: how compelling is the offer itself (e.g. 1 month free scores higher than $50 off)
- marketCompetitiveness: how it compares to typical market specials
- leadAttraction: likelihood to generate inquiry volume
- conversionPotential: likelihood that leads who engage will convert
- overall: weighted average (offerStrength 30%, marketCompetitiveness 20%, leadAttraction 25%, conversionPotential 25%)`,
    messages: [{
      role:    "user",
      content: `Special offer: ${input.specialOffer}
Target renter: ${input.targetRenter ?? "not specified"}
Campaign goal: ${input.campaignGoal ?? "not specified"}
Monthly budget: ${input.budgetCents ? `$${(input.budgetCents / 100).toFixed(0)}` : "not specified"}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(text) as OfferScores;
  } catch {
    return {
      offerStrength: 50, marketCompetitiveness: 50,
      leadAttraction: 50, conversionPotential: 50,
      overall: 50, explanation: "Unable to score offer at this time.",
    };
  }
}

// ── generateOfferRecommendation ───────────────────────────────────────────────

export async function generateOfferRecommendation(input: OfferLabInput): Promise<OfferRecommendation> {
  const response = await ai().messages.create({
    model:      MODEL,
    max_tokens: 700,
    system: `You are a leasing marketing strategist. Given a property's current offer, generate an improved version.
Return ONLY valid JSON:
{
  "improvedSpecial": "string",
  "improvedMessagingAngle": "string",
  "suggestedPositioning": "string",
  "reasoning": "string — 2 sentences explaining why your version is stronger"
}`,
    messages: [{
      role:    "user",
      content: `Current special: ${input.specialOffer}
Target renter: ${input.targetRenter ?? "general"}
Campaign goal: ${input.campaignGoal ?? "maximize lease velocity"}
Budget: ${input.budgetCents ? `$${(input.budgetCents / 100).toFixed(0)}/mo` : "not specified"}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(text) as OfferRecommendation;
  } catch {
    return {
      improvedSpecial:         input.specialOffer,
      improvedMessagingAngle:  "Highlight value and community lifestyle.",
      suggestedPositioning:    "Position as the best value in the submarket.",
      reasoning:               "Unable to generate recommendation at this time.",
    };
  }
}

// ── simulateCampaignOutcome ───────────────────────────────────────────────────

export async function simulateCampaignOutcome(
  input: OfferLabInput,
  aiRec: OfferRecommendation
): Promise<OfferSimulation> {
  const response = await ai().messages.create({
    model:      MODEL,
    max_tokens: 700,
    system: `You are a real estate leasing analyst. Estimate campaign outcomes for two versions of an offer.
These are heuristic estimates, not guarantees. Be conservative and realistic.
Return ONLY valid JSON:
{
  "userVersion": {
    "expectedLeadIncreasePct": number,
    "expectedApplicationRatePct": number,
    "expectedLeaseConversionPct": number,
    "estimatedOccupancyImpact": number
  },
  "aiVersion": {
    "expectedLeadIncreasePct": number,
    "expectedApplicationRatePct": number,
    "expectedLeaseConversionPct": number,
    "estimatedOccupancyImpact": number
  },
  "confidenceScore": number,
  "comparisonSummary": "1-2 sentence plain-English comparison"
}

Fields: expectedLeadIncreasePct = % increase in leads vs. running no special. expectedApplicationRatePct = % of inquiring leads who apply. expectedLeaseConversionPct = % of applicants who sign. estimatedOccupancyImpact = percentage points of occupancy gained over 30 days.`,
    messages: [{
      role:    "user",
      content: `User's offer: ${input.specialOffer}
AI improved offer: ${aiRec.improvedSpecial}
AI messaging angle: ${aiRec.improvedMessagingAngle}
Target renter: ${input.targetRenter ?? "general"}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(text) as OfferSimulation;
  } catch {
    return {
      userVersion: { expectedLeadIncreasePct: 10, expectedApplicationRatePct: 12, expectedLeaseConversionPct: 8, estimatedOccupancyImpact: 1 },
      aiVersion:   { expectedLeadIncreasePct: 18, expectedApplicationRatePct: 18, expectedLeaseConversionPct: 12, estimatedOccupancyImpact: 2 },
      confidenceScore: 55,
      comparisonSummary: "The AI version is estimated to outperform the original on lead volume and conversion.",
    };
  }
}
