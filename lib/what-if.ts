// What-If Simulation Engine — estimate outcomes of hypothetical strategy changes.

import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { calculateFunnelMetrics } from "@/lib/conversion-analytics";
import { predictOccupancy } from "@/lib/occupancy-prediction";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function ai(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export interface ScenarioInput {
  description: string;
  changes: {
    budgetIncreasePct?: number;
    budgetDecreasePct?: number;
    offerChange?: string;
    followUpIntensityChange?: "increase" | "decrease";
    channelSwitch?: string;
    messagingAngleChange?: string;
  };
}

export interface ScenarioResult {
  scenarioDescription: string;
  estimatedLeadImpactPct: number;
  estimatedApplicationImpactPct: number;
  estimatedLeaseImpactPct: number;
  estimatedOccupancyImpactPct: number;
  estimatedCostImpactCents: number;
  confidenceScore: number;
  reasoning: string;
}

export interface ScenarioComparison {
  baseline: ScenarioResult;
  proposed: ScenarioResult;
  winner: "baseline" | "proposed";
  summary: string;
}

// ── simulateScenario ──────────────────────────────────────────────────────────

export async function simulateScenario(
  propertyId: string,
  scenario: ScenarioInput
): Promise<ScenarioResult> {
  const db = getSupabaseAdmin();
  const [funnel, forecast] = await Promise.all([
    calculateFunnelMetrics(propertyId),
    predictOccupancy(propertyId),
  ]);

  const response = await ai().messages.create({
    model:      MODEL,
    max_tokens: 600,
    system: `You are a real estate strategy analyst. Estimate the impact of a proposed strategy change.
These are structured estimates, not guarantees. Be conservative.
Return ONLY valid JSON:
{
  "estimatedLeadImpactPct": number,
  "estimatedApplicationImpactPct": number,
  "estimatedLeaseImpactPct": number,
  "estimatedOccupancyImpactPct": number,
  "estimatedCostImpactCents": number,
  "confidenceScore": number,
  "reasoning": "2 sentences"
}
Positive numbers = improvement. Negative = decline. OccupancyImpact is percentage points.`,
    messages: [{
      role:    "user",
      content: `Current state:
Leads (30d): ${funnel.totalLeads}
New→Reply rate: ${funnel.newToReplyRate}%
Tour rate: ${funnel.replyToTourRate}%
Application rate: ${funnel.tourToApplicationRate}%
Lease rate: ${funnel.applicationToLeaseRate}%
Projected occupancy: ${forecast.forecast30d.toFixed(1)}%

Proposed change: ${scenario.description}
${scenario.changes.budgetIncreasePct   ? `Budget increase: ${scenario.changes.budgetIncreasePct}%` : ""}
${scenario.changes.budgetDecreasePct   ? `Budget decrease: ${scenario.changes.budgetDecreasePct}%` : ""}
${scenario.changes.offerChange         ? `Offer change: ${scenario.changes.offerChange}` : ""}
${scenario.changes.followUpIntensityChange ? `Follow-up: ${scenario.changes.followUpIntensityChange}` : ""}
${scenario.changes.channelSwitch       ? `Channel switch: ${scenario.changes.channelSwitch}` : ""}
${scenario.changes.messagingAngleChange ? `Messaging: ${scenario.changes.messagingAngleChange}` : ""}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  let result: Omit<ScenarioResult, "scenarioDescription">;
  try {
    result = JSON.parse(text);
  } catch {
    result = {
      estimatedLeadImpactPct: 0, estimatedApplicationImpactPct: 0,
      estimatedLeaseImpactPct: 0, estimatedOccupancyImpactPct: 0,
      estimatedCostImpactCents: 0, confidenceScore: 30,
      reasoning: "Unable to generate estimate.",
    };
  }

  const full: ScenarioResult = { scenarioDescription: scenario.description, ...result };

  await db.from("what_if_runs").insert({
    property_id:                     propertyId,
    scenario_description:            scenario.description,
    scenario_input:                  scenario.changes,
    estimated_lead_impact_pct:       full.estimatedLeadImpactPct,
    estimated_application_impact_pct: full.estimatedApplicationImpactPct,
    estimated_lease_impact_pct:      full.estimatedLeaseImpactPct,
    estimated_occupancy_impact_pct:  full.estimatedOccupancyImpactPct,
    estimated_cost_impact_cents:     full.estimatedCostImpactCents,
    confidence_score:                full.confidenceScore,
    reasoning:                       full.reasoning,
  });

  return full;
}

// ── compareScenarios ──────────────────────────────────────────────────────────

export async function compareScenarios(
  propertyId: string,
  scenarios: [ScenarioInput, ScenarioInput]
): Promise<ScenarioComparison> {
  const [baseline, proposed] = await Promise.all([
    simulateScenario(propertyId, scenarios[0]),
    simulateScenario(propertyId, scenarios[1]),
  ]);

  const proposedScore = proposed.estimatedLeaseImpactPct + proposed.estimatedOccupancyImpactPct;
  const baselineScore = baseline.estimatedLeaseImpactPct + baseline.estimatedOccupancyImpactPct;
  const winner: ScenarioComparison["winner"] = proposedScore >= baselineScore ? "proposed" : "baseline";

  const summary = winner === "proposed"
    ? `The proposed strategy is estimated to outperform the baseline by ${(proposedScore - baselineScore).toFixed(1)} points on combined lease and occupancy impact.`
    : `The baseline strategy appears stronger. The proposed change may not deliver sufficient improvement.`;

  return { baseline, proposed, winner, summary };
}
