// Strategic Insights — generate actionable insight cards from system signals.

import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { calculateFunnelMetrics } from "@/lib/conversion-analytics";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function ai(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export interface Insight {
  title: string;
  explanation: string;
  impactLevel: "low" | "medium" | "high" | "critical";
  recommendedAction: string;
  category: string;
}

// ── generateInsights ──────────────────────────────────────────────────────────

export async function generateInsights(propertyId: string): Promise<Insight[]> {
  const db = getSupabaseAdmin();

  // Load signals
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [funnel, { data: leads }, { data: campaigns }, { data: conversations }] = await Promise.all([
    calculateFunnelMetrics(propertyId),
    db.from("leads").select("status, created_at, last_contacted_at").eq("property_id", propertyId).gte("created_at", thirtyDaysAgo),
    db.from("campaigns").select("status, leads_generated").eq("property_id", propertyId).limit(5),
    db.from("conversations").select("direction, created_at").eq("property_id", propertyId).gte("created_at", thirtyDaysAgo).limit(200),
  ]);

  // Calculate avg response time (inbound → next outbound)
  const inboundTimes  = (conversations ?? []).filter(c => c.direction === "inbound").map(c => new Date(c.created_at).getTime()).sort();
  const outboundTimes = (conversations ?? []).filter(c => c.direction === "outbound").map(c => new Date(c.created_at).getTime()).sort();
  let avgResponseMin = 0;
  if (inboundTimes.length > 0 && outboundTimes.length > 0) {
    const pairs: number[] = [];
    for (const t of inboundTimes) {
      const reply = outboundTimes.find(o => o > t);
      if (reply) pairs.push((reply - t) / 60000);
    }
    if (pairs.length > 0) avgResponseMin = pairs.reduce((s, v) => s + v, 0) / pairs.length;
  }

  const activeCampaigns = (campaigns ?? []).filter(c => c.status === "active").length;

  const response = await ai().messages.create({
    model:      MODEL,
    max_tokens: 1000,
    system: `You are a leasing performance analyst. Generate 3–5 strategic insights based on system signals.
Return ONLY valid JSON — an array of insight objects:
[{
  "title": "Short headline (max 60 chars)",
  "explanation": "1-2 sentences explaining what's happening and why it matters",
  "impactLevel": "low" | "medium" | "high" | "critical",
  "recommendedAction": "1 specific action the operator should take",
  "category": "response_time" | "offer_quality" | "campaign_performance" | "lead_behavior" | "conversion"
}]
Be specific and data-driven. Avoid vague insights.`,
    messages: [{
      role:    "user",
      content: `Total leads (30d): ${funnel.totalLeads}
Avg response time: ${avgResponseMin.toFixed(0)} minutes
New→Contacted rate: ${funnel.newToReplyRate}%
Contacted→Tour rate: ${funnel.replyToTourRate}%
Tour→Application rate: ${funnel.tourToApplicationRate}%
Application→Lease rate: ${funnel.applicationToLeaseRate}%
Biggest drop-off: ${funnel.biggestDropOffStage}
Active campaigns: ${activeCampaigns}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  let insights: Insight[];
  try {
    insights = JSON.parse(text);
    if (!Array.isArray(insights)) insights = [];
  } catch {
    insights = [];
  }

  // Persist
  if (insights.length > 0) {
    const rows = insights.map(i => ({
      property_id:        propertyId,
      title:              i.title,
      explanation:        i.explanation,
      impact_level:       i.impactLevel,
      recommended_action: i.recommendedAction,
      category:           i.category,
    }));
    await db.from("insights").insert(rows);
  }

  return insights;
}

// ── getActiveInsights ─────────────────────────────────────────────────────────

export async function getActiveInsights(propertyId: string): Promise<Insight[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("insights")
    .select("*")
    .eq("property_id", propertyId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  return (data ?? []).map(r => ({
    title:             r.title,
    explanation:       r.explanation,
    impactLevel:       r.impact_level,
    recommendedAction: r.recommended_action,
    category:          r.category,
  }));
}
