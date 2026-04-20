// Weekly Executive Digest — structured weekly summary per property and portfolio.

import { getSupabaseAdmin } from "@/lib/supabase";
import { calculateFunnelMetrics } from "@/lib/conversion-analytics";
import { generateInsights } from "@/lib/strategic-insights";

export interface WeeklyDigest {
  digestType: "property" | "portfolio";
  weekStart: string;
  weekEnd: string;
  leadsGenerated: number;
  avgResponseTimeMin: number;
  toursBooked: number;
  applicationsStarted: number;
  leasesSignedInPeriod: number;
  performanceFeesCents: number;
  biggestProblem: string;
  biggestOpportunity: string;
  recommendedNextMove: string;
}

// ── generateWeeklyPropertyDigest ─────────────────────────────────────────────

export async function generateWeeklyPropertyDigest(propertyId: string): Promise<WeeklyDigest> {
  const db   = getSupabaseAdmin();
  const now  = new Date();
  const weekStart = new Date(now.getTime() - 7 * 86400000);

  const [
    { data: leads },
    { data: leases },
    { data: conversations },
    { data: fees },
    insights,
  ] = await Promise.all([
    db.from("leads").select("status, created_at").eq("property_id", propertyId).gte("created_at", weekStart.toISOString()),
    db.from("leases").select("id").eq("property_id", propertyId).gte("lease_signed_date", weekStart.toISOString().slice(0, 10)),
    db.from("conversations").select("direction, created_at").eq("property_id", propertyId).gte("created_at", weekStart.toISOString()).limit(500),
    db.from("performance_fees").select("amount_cents").eq("property_id", propertyId).gte("created_at", weekStart.toISOString()),
    generateInsights(propertyId),
  ]);

  const toursBooked       = (leads ?? []).filter(l => ["tour_scheduled", "applied", "won"].includes(l.status)).length;
  const applicationsStart = (leads ?? []).filter(l => ["applied", "won"].includes(l.status)).length;
  const leasesSignedCount = leases?.length ?? 0;
  const perfFees          = (fees ?? []).reduce((s, f) => s + (f.amount_cents ?? 0), 0);

  // Avg response time
  const inbound  = (conversations ?? []).filter(c => c.direction === "inbound").map(c => new Date(c.created_at).getTime()).sort();
  const outbound = (conversations ?? []).filter(c => c.direction === "outbound").map(c => new Date(c.created_at).getTime()).sort();
  const pairs: number[] = [];
  for (const t of inbound) {
    const reply = outbound.find(o => o > t);
    if (reply) pairs.push((reply - t) / 60000);
  }
  const avgResponseMin = pairs.length > 0 ? pairs.reduce((s, v) => s + v, 0) / pairs.length : 0;

  // Pick biggest problem and opportunity from insights
  const critical  = insights.find(i => i.impactLevel === "critical" || i.impactLevel === "high");
  const opportunity = insights.find(i => i.impactLevel === "medium");

  const biggestProblem     = critical?.title ?? "No critical issues this week";
  const biggestOpportunity = opportunity?.title ?? "Maintain current momentum";
  const recommendedNextMove = critical?.recommendedAction ?? opportunity?.recommendedAction ?? "Review your lead pipeline";

  const digest: WeeklyDigest = {
    digestType:           "property",
    weekStart:            weekStart.toISOString().slice(0, 10),
    weekEnd:              now.toISOString().slice(0, 10),
    leadsGenerated:       leads?.length ?? 0,
    avgResponseTimeMin:   Math.round(avgResponseMin),
    toursBooked,
    applicationsStarted:  applicationsStart,
    leasesSignedInPeriod: leasesSignedCount,
    performanceFeesCents: perfFees,
    biggestProblem,
    biggestOpportunity,
    recommendedNextMove,
  };

  await db.from("weekly_digests").insert({
    property_id:            propertyId,
    digest_type:            "property",
    week_start:             digest.weekStart,
    week_end:               digest.weekEnd,
    leads_generated:        digest.leadsGenerated,
    avg_response_time_min:  digest.avgResponseTimeMin,
    tours_booked:           digest.toursBooked,
    applications_started:   digest.applicationsStarted,
    leases_signed:          digest.leasesSignedInPeriod,
    performance_fees_cents: digest.performanceFeesCents,
    biggest_problem:        digest.biggestProblem,
    biggest_opportunity:    digest.biggestOpportunity,
    recommended_next_move:  digest.recommendedNextMove,
  });

  return digest;
}

// ── generateWeeklyOrganizationDigest ─────────────────────────────────────────

export async function generateWeeklyOrganizationDigest(operatorId: string): Promise<WeeklyDigest> {
  const db = getSupabaseAdmin();
  const { data: properties } = await db.from("properties").select("id").eq("operator_id", operatorId);
  if (!properties || properties.length === 0) {
    return {
      digestType: "portfolio", weekStart: "", weekEnd: "",
      leadsGenerated: 0, avgResponseTimeMin: 0, toursBooked: 0,
      applicationsStarted: 0, leasesSignedInPeriod: 0, performanceFeesCents: 0,
      biggestProblem: "No properties configured", biggestOpportunity: "Add your first property",
      recommendedNextMove: "Set up a property to start tracking",
    };
  }

  const digests = await Promise.all(properties.map(p => generateWeeklyPropertyDigest(p.id)));

  const combined: WeeklyDigest = {
    digestType:           "portfolio",
    weekStart:            digests[0]?.weekStart ?? "",
    weekEnd:              digests[0]?.weekEnd   ?? "",
    leadsGenerated:       digests.reduce((s, d) => s + d.leadsGenerated, 0),
    avgResponseTimeMin:   Math.round(digests.reduce((s, d) => s + d.avgResponseTimeMin, 0) / digests.length),
    toursBooked:          digests.reduce((s, d) => s + d.toursBooked, 0),
    applicationsStarted:  digests.reduce((s, d) => s + d.applicationsStarted, 0),
    leasesSignedInPeriod: digests.reduce((s, d) => s + d.leasesSignedInPeriod, 0),
    performanceFeesCents: digests.reduce((s, d) => s + d.performanceFeesCents, 0),
    biggestProblem:       digests.find(d => d.biggestProblem !== "No critical issues this week")?.biggestProblem ?? "No critical issues this week",
    biggestOpportunity:   digests[0]?.biggestOpportunity ?? "Maintain momentum",
    recommendedNextMove:  digests[0]?.recommendedNextMove ?? "Review your portfolio",
  };

  await db.from("weekly_digests").insert({
    operator_id:            operatorId,
    digest_type:            "portfolio",
    week_start:             combined.weekStart,
    week_end:               combined.weekEnd,
    leads_generated:        combined.leadsGenerated,
    avg_response_time_min:  combined.avgResponseTimeMin,
    tours_booked:           combined.toursBooked,
    applications_started:   combined.applicationsStarted,
    leases_signed:          combined.leasesSignedInPeriod,
    performance_fees_cents: combined.performanceFeesCents,
    biggest_problem:        combined.biggestProblem,
    biggest_opportunity:    combined.biggestOpportunity,
    recommended_next_move:  combined.recommendedNextMove,
  });

  return combined;
}
