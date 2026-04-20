// Occupancy Risk Command Center — combine all signals into a unified risk profile.

import { getSupabaseAdmin } from "@/lib/supabase";
import { predictOccupancy } from "@/lib/occupancy-prediction";
import { identifyConversionLeaks } from "@/lib/conversion-analytics";
import { detectRisk } from "@/lib/intervention";

export interface OccupancyRiskProfile {
  propertyId: string;
  overallRiskScore: number;           // 0–100
  riskLevel: "low" | "medium" | "high" | "critical";
  topRiskDrivers: string[];
  recommendedInterventions: string[];
  shouldTriggerInterventionMode: boolean;
  forecast30d: number;
  confidenceScore: number;
}

// ── calculateOccupancyRisk ────────────────────────────────────────────────────

export async function calculateOccupancyRisk(propertyId: string): Promise<OccupancyRiskProfile> {
  const [forecast, leaks, risk] = await Promise.all([
    predictOccupancy(propertyId),
    identifyConversionLeaks(propertyId),
    detectRisk(propertyId),
  ]);

  const db = getSupabaseAdmin();
  const { data: handoffs } = await db
    .from("handoff_events")
    .select("id")
    .eq("property_id", propertyId)
    .eq("status", "open");

  const { data: stalledApps } = await db
    .from("leads")
    .select("id")
    .eq("property_id", propertyId)
    .eq("status", "applied")
    .lt("last_contacted_at", new Date(Date.now() - 5 * 86400000).toISOString());

  let riskScore = risk.riskScore;
  const drivers: string[] = [...risk.reasons];
  const interventions: string[] = [];

  // Add funnel leak risk
  const criticalLeaks = leaks.filter(l => l.severity === "critical" || l.severity === "high");
  if (criticalLeaks.length > 0) {
    riskScore = Math.min(100, riskScore + 15);
    drivers.push(`${criticalLeaks.length} high-severity conversion drop-off(s)`);
    interventions.push("Fix conversion leaks at: " + criticalLeaks.map(l => l.stage).join(", "));
  }

  // Open handoffs
  if ((handoffs?.length ?? 0) > 0) {
    riskScore = Math.min(100, riskScore + 5);
    drivers.push(`${handoffs?.length} leads in human takeover (not receiving AI follow-up)`);
    interventions.push("Resolve or return open handoffs to AI");
  }

  // Stalled applications
  if ((stalledApps?.length ?? 0) > 0) {
    riskScore = Math.min(100, riskScore + 10);
    drivers.push(`${stalledApps?.length} applications stalled for 5+ days`);
    interventions.push("Human outreach to stalled applicants");
  }

  const riskLevel: OccupancyRiskProfile["riskLevel"] =
    riskScore >= 80 ? "critical" :
    riskScore >= 60 ? "high"     :
    riskScore >= 35 ? "medium"   : "low";

  if (interventions.length === 0) {
    interventions.push("Continue current strategy — occupancy is stable");
  }

  return {
    propertyId,
    overallRiskScore:             Math.round(riskScore),
    riskLevel,
    topRiskDrivers:               drivers.slice(0, 5),
    recommendedInterventions:     interventions.slice(0, 5),
    shouldTriggerInterventionMode: riskScore >= 60,
    forecast30d:                  forecast.forecast30d,
    confidenceScore:              forecast.confidenceScore,
  };
}

// ── buildRiskSummary ──────────────────────────────────────────────────────────

export async function buildRiskSummary(propertyId: string): Promise<string> {
  const profile = await calculateOccupancyRisk(propertyId);

  return [
    `Risk level: ${profile.riskLevel.toUpperCase()} (${profile.overallRiskScore}/100)`,
    `30-day forecast: ${profile.forecast30d.toFixed(1)}%`,
    profile.topRiskDrivers.length > 0
      ? `Top drivers: ${profile.topRiskDrivers[0]}`
      : "No significant risk drivers detected",
    `Recommended: ${profile.recommendedInterventions[0] ?? "Monitor regularly"}`,
  ].join(" | ");
}
