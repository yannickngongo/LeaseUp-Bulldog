// Narrative Intelligence — translate system data into plain-English operating stories.

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

export interface Narrative {
  headline: string;
  explanation: string;
  recommendedAction: string;
  impactLevel: "low" | "medium" | "high" | "critical";
}

async function callNarrative(prompt: string): Promise<Narrative> {
  const response = await ai().messages.create({
    model:      MODEL,
    max_tokens: 500,
    system: `You are a leasing operations analyst writing an executive-level narrative for a property operator.
Be factual, direct, and action-oriented. No fluff.
Return ONLY valid JSON:
{
  "headline": "One sharp sentence (max 80 chars)",
  "explanation": "2-3 sentences explaining what happened, why it matters",
  "recommendedAction": "One specific next step",
  "impactLevel": "low" | "medium" | "high" | "critical"
}`,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(text) as Narrative;
  } catch {
    return {
      headline:          "System update available",
      explanation:       "A narrative could not be generated at this time.",
      recommendedAction: "Review your dashboard manually.",
      impactLevel:       "low",
    };
  }
}

// ── generatePropertyNarrative ─────────────────────────────────────────────────

export async function generatePropertyNarrative(propertyId: string): Promise<Narrative> {
  const db = getSupabaseAdmin();

  const [funnel, forecast, { data: leads }] = await Promise.all([
    calculateFunnelMetrics(propertyId),
    predictOccupancy(propertyId),
    db.from("leads").select("status, created_at, human_takeover").eq("property_id", propertyId)
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);

  const humanTakovers = (leads ?? []).filter(l => l.human_takeover).length;

  const narrative = await callNarrative(
    `Property data (last 30 days):
Total leads: ${funnel.totalLeads}
New→Contacted: ${funnel.newToReplyRate}%
Contacted→Tour: ${funnel.replyToTourRate}%
Tour→Application: ${funnel.tourToApplicationRate}%
Application→Lease: ${funnel.applicationToLeaseRate}%
Biggest drop-off: ${funnel.biggestDropOffStage}
Projected occupancy (30d): ${forecast.forecast30d.toFixed(1)}%
Occupancy risk: ${forecast.riskLevel}
Open human takeovers: ${humanTakovers}`
  );

  await db.from("insights_narratives").insert({
    property_id:        propertyId,
    narrative_type:     "property",
    headline:           narrative.headline,
    explanation:        narrative.explanation,
    recommended_action: narrative.recommendedAction,
    impact_level:       narrative.impactLevel,
    period_start:       new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    period_end:         new Date().toISOString().slice(0, 10),
  });

  return narrative;
}

// ── generatePortfolioNarrative ────────────────────────────────────────────────

export async function generatePortfolioNarrative(operatorId: string): Promise<Narrative> {
  const db = getSupabaseAdmin();
  const { data: properties } = await db
    .from("properties")
    .select("id, name")
    .eq("operator_id", operatorId);

  if (!properties || properties.length === 0) {
    return { headline: "No properties found", explanation: "No properties are configured for this operator.", recommendedAction: "Add your first property.", impactLevel: "low" };
  }

  const funnels = await Promise.all(properties.slice(0, 5).map(p => calculateFunnelMetrics(p.id)));
  const totalLeads = funnels.reduce((s, f) => s + f.totalLeads, 0);
  const avgReplRate = funnels.reduce((s, f) => s + f.newToReplyRate, 0) / funnels.length;
  const avgTourRate = funnels.reduce((s, f) => s + f.replyToTourRate, 0) / funnels.length;

  const narrative = await callNarrative(
    `Portfolio summary (${properties.length} properties, last 30 days):
Total leads: ${totalLeads}
Avg reply rate: ${avgReplRate.toFixed(1)}%
Avg tour rate: ${avgTourRate.toFixed(1)}%
Properties with data: ${funnels.length}`
  );

  await db.from("insights_narratives").insert({
    operator_id:        operatorId,
    narrative_type:     "portfolio",
    headline:           narrative.headline,
    explanation:        narrative.explanation,
    recommended_action: narrative.recommendedAction,
    impact_level:       narrative.impactLevel,
    period_start:       new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    period_end:         new Date().toISOString().slice(0, 10),
  });

  return narrative;
}

// ── generateWeeklyNarrative ───────────────────────────────────────────────────

export async function generateWeeklyNarrative(propertyId: string): Promise<Narrative> {
  const db = getSupabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: leads }, { data: leases }] = await Promise.all([
    db.from("leads").select("status, created_at").eq("property_id", propertyId).gte("created_at", sevenDaysAgo),
    db.from("leases").select("id").eq("property_id", propertyId).gte("lease_signed_date", sevenDaysAgo.slice(0, 10)),
  ]);

  const wonLeads = (leads ?? []).filter(l => l.status === "won").length;

  const narrative = await callNarrative(
    `Weekly summary (last 7 days):
New leads: ${leads?.length ?? 0}
Leases signed: ${leases?.length ?? 0}
Leads converted this week: ${wonLeads}`
  );

  await db.from("insights_narratives").insert({
    property_id:        propertyId,
    narrative_type:     "weekly",
    headline:           narrative.headline,
    explanation:        narrative.explanation,
    recommended_action: narrative.recommendedAction,
    impact_level:       narrative.impactLevel,
    period_start:       sevenDaysAgo.slice(0, 10),
    period_end:         new Date().toISOString().slice(0, 10),
  });

  return narrative;
}
