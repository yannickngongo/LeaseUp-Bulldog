// Track operator milestones: setup_complete, first_lead, first_tour, first_lease.
// Idempotent — only the first achievement of each milestone is recorded
// (UNIQUE constraint on (operator_id, milestone)).

import { getSupabaseAdmin } from "@/lib/supabase";

export type Milestone = "setup_complete" | "first_lead" | "first_tour" | "first_lease";

export async function recordMilestone(
  operatorId: string,
  milestone:  Milestone,
  metadata?:  Record<string, unknown>
): Promise<{ first: boolean; achievedAt: string | null }> {
  const db = getSupabaseAdmin();

  // Upsert with conflict on (operator_id, milestone) — only first hit lands
  const { data: existing } = await db
    .from("operator_milestones")
    .select("achieved_at")
    .eq("operator_id", operatorId)
    .eq("milestone", milestone)
    .maybeSingle();

  if (existing) {
    return { first: false, achievedAt: existing.achieved_at as string };
  }

  const { data, error } = await db
    .from("operator_milestones")
    .insert({ operator_id: operatorId, milestone, metadata: metadata ?? null })
    .select("achieved_at")
    .single();

  if (error) {
    // Race: another request hit the unique constraint between our SELECT and INSERT
    if ((error as { code?: string }).code === "23505") {
      return { first: false, achievedAt: null };
    }
    console.error(`[milestones] Failed to record ${milestone}:`, error);
    return { first: false, achievedAt: null };
  }

  return { first: true, achievedAt: data?.achieved_at as string };
}

/**
 * Returns time-in-seconds between two milestones.
 * E.g. timeBetween(opId, "setup_complete", "first_lead") = onboarding-to-first-lead time.
 */
export async function timeBetween(
  operatorId: string,
  start:      Milestone,
  end:        Milestone
): Promise<number | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("operator_milestones")
    .select("milestone, achieved_at")
    .eq("operator_id", operatorId)
    .in("milestone", [start, end]);

  if (!data || data.length < 2) return null;
  const startRow = data.find(r => r.milestone === start);
  const endRow   = data.find(r => r.milestone === end);
  if (!startRow || !endRow) return null;

  return Math.round(
    (new Date(endRow.achieved_at as string).getTime() -
      new Date(startRow.achieved_at as string).getTime()) / 1000
  );
}
