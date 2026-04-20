// Lead Prioritization Engine — continuously rank leads by urgency and opportunity.

import { getSupabaseAdmin } from "@/lib/supabase";
import { predictOccupancy } from "@/lib/occupancy-prediction";

export interface PrioritizedLead {
  leadId: string;
  name: string;
  status: string;
  priorityRank: number;
  priorityScore: number;
  urgency: "low" | "medium" | "high" | "critical";
  recommendedNextAction: string;
  recommendedResponseUrgency: "within_1h" | "within_4h" | "within_24h" | "within_week";
  reasoning: string;
}

// ── prioritizeLeads ───────────────────────────────────────────────────────────

export async function prioritizeLeads(propertyId: string): Promise<PrioritizedLead[]> {
  const db = getSupabaseAdmin();

  const [{ data: leads }, { data: scores }, forecast] = await Promise.all([
    db.from("leads")
      .select("id, name, status, created_at, last_contacted_at, move_in_date, budget_min, budget_max, bedrooms, human_takeover, opt_out")
      .eq("property_id", propertyId)
      .not("status", "in", '("won","lost")')
      .is("opt_out", false),
    db.from("lead_scores").select("*"),
    predictOccupancy(propertyId),
  ]);

  if (!leads || leads.length === 0) return [];

  const scoreMap = new Map((scores ?? []).map(s => [s.lead_id, s]));
  const occupancyUrgencyBonus = forecast.riskLevel === "critical" ? 20 :
                                 forecast.riskLevel === "high"     ? 10 : 0;

  const STAGE_WEIGHT: Record<string, number> = {
    applied:        40,
    tour_scheduled: 30,
    engaged:        20,
    contacted:      10,
    new:             5,
  };

  const prioritized: PrioritizedLead[] = leads.map(lead => {
    const score     = scoreMap.get(lead.id);
    const stageScore = STAGE_WEIGHT[lead.status] ?? 0;
    const intentScore = score?.intent_score ?? 40;

    // Recency bonus — leads contacted in last 24h get boost
    const hoursSinceContact = lead.last_contacted_at
      ? (Date.now() - new Date(lead.last_contacted_at).getTime()) / 3600000
      : 999;
    const recencyBonus = hoursSinceContact < 24 ? 15 : hoursSinceContact < 72 ? 5 : 0;

    // Move-in urgency
    const daysToMoveIn = lead.move_in_date
      ? (new Date(lead.move_in_date).getTime() - Date.now()) / 86400000
      : 999;
    const moveInBonus = daysToMoveIn < 14 ? 20 : daysToMoveIn < 30 ? 10 : 0;

    const priorityScore = Math.min(100,
      stageScore + (intentScore * 0.3) + recencyBonus + moveInBonus + occupancyUrgencyBonus
    );

    const urgency: PrioritizedLead["urgency"] =
      priorityScore >= 80 ? "critical" :
      priorityScore >= 60 ? "high"     :
      priorityScore >= 40 ? "medium"   : "low";

    const recommendedNextAction =
      lead.status === "applied"         ? "Follow up on application completion" :
      lead.status === "tour_scheduled"  ? "Confirm tour and send reminder"      :
      lead.status === "engaged"         ? "Send tour invite or next qualifier"  :
      lead.status === "contacted"       ? "Send qualification follow-up"        :
      "Send initial AI outreach";

    const recommendedResponseUrgency: PrioritizedLead["recommendedResponseUrgency"] =
      urgency === "critical" ? "within_1h"   :
      urgency === "high"     ? "within_4h"   :
      urgency === "medium"   ? "within_24h"  : "within_week";

    return {
      leadId:                     lead.id,
      name:                       lead.name,
      status:                     lead.status,
      priorityRank:               0, // set after sorting
      priorityScore:              Math.round(priorityScore),
      urgency,
      recommendedNextAction,
      recommendedResponseUrgency,
      reasoning: `Stage: ${lead.status} (+${stageScore}), Intent: ${intentScore} (+${Math.round(intentScore * 0.3)}), Recency: +${recencyBonus}, Move-in: +${moveInBonus}`,
    };
  });

  // Sort and assign ranks
  prioritized.sort((a, b) => b.priorityScore - a.priorityScore);
  prioritized.forEach((l, i) => { l.priorityRank = i + 1; });

  return prioritized;
}

// ── getPriorityQueue ──────────────────────────────────────────────────────────

export async function getPriorityQueue(
  propertyId: string,
  limit = 20
): Promise<PrioritizedLead[]> {
  const all = await prioritizeLeads(propertyId);
  return all.slice(0, limit);
}
