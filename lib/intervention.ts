// Vacancy Intervention — detect occupancy risk and surface recommended actions.
// Does NOT auto-execute — recommendation only.

import { getSupabaseAdmin } from "@/lib/supabase";
import { predictOccupancy } from "@/lib/occupancy-prediction";
import { identifyConversionLeaks } from "@/lib/conversion-analytics";

const OCCUPANCY_THRESHOLD = 88; // trigger intervention below this %

export interface InterventionRecommendation {
  action: string;
  reason: string;
  urgency: "low" | "medium" | "high" | "critical";
  category: "follow_up" | "offer" | "campaign" | "lead_priority" | "human_review";
}

// ── detectRisk ────────────────────────────────────────────────────────────────

export async function detectRisk(propertyId: string): Promise<{
  shouldIntervene: boolean;
  riskScore: number;
  reasons: string[];
}> {
  const forecast = await predictOccupancy(propertyId);
  const leaks    = await identifyConversionLeaks(propertyId);

  let riskScore = 0;
  const reasons: string[] = [];

  if (forecast.forecast30d < OCCUPANCY_THRESHOLD) {
    riskScore += 40;
    reasons.push(`Projected 30-day occupancy (${forecast.forecast30d.toFixed(1)}%) is below ${OCCUPANCY_THRESHOLD}%`);
  }
  if (forecast.riskLevel === "critical") { riskScore += 30; reasons.push("Occupancy forecast is critical"); }
  if (forecast.riskLevel === "high")     { riskScore += 20; reasons.push("Occupancy forecast is high risk"); }

  const criticalLeaks = leaks.filter(l => l.severity === "critical" || l.severity === "high");
  if (criticalLeaks.length > 0) {
    riskScore += 20;
    reasons.push(`${criticalLeaks.length} critical funnel drop-off(s): ${criticalLeaks.map(l => l.stage).join(", ")}`);
  }

  return { shouldIntervene: riskScore >= 40, riskScore: Math.min(100, riskScore), reasons };
}

// ── triggerIntervention ───────────────────────────────────────────────────────

export async function triggerIntervention(propertyId: string): Promise<InterventionRecommendation[]> {
  const db = getSupabaseAdmin();
  const { shouldIntervene, riskScore, reasons } = await detectRisk(propertyId);

  if (!shouldIntervene) return [];

  const recommendations: InterventionRecommendation[] = [
    {
      action:   "Increase follow-up intensity for all active leads",
      reason:   "Occupancy risk is elevated. More touchpoints improve conversion.",
      urgency:  "high",
      category: "follow_up",
    },
    {
      action:   "Review and strengthen current leasing special",
      reason:   "A more competitive offer can accelerate lease velocity when occupancy is declining.",
      urgency:  "high",
      category: "offer",
    },
    {
      action:   "Prioritize leads with the highest intent score",
      reason:   "Focus agent time on leads most likely to convert in the next 7–14 days.",
      urgency:  "medium",
      category: "lead_priority",
    },
    {
      action:   "Consider increasing ad budget by 20–30%",
      reason:   "Lower occupancy requires higher lead volume to recover.",
      urgency:  "medium",
      category: "campaign",
    },
    {
      action:   "Flag stalled applications for human follow-up",
      reason:   "Applications started but not completed represent recoverable revenue.",
      urgency:  "medium",
      category: "human_review",
    },
  ];

  // Persist intervention event
  await db.from("intervention_events").insert({
    property_id:          propertyId,
    trigger_reason:       reasons.join("; "),
    risk_score:           riskScore,
    recommended_actions:  recommendations,
    status:               "pending",
  });

  return recommendations;
}
