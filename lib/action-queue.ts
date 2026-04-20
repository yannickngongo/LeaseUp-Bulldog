// Action Queue / Operator Cockpit — unified queue of all recommended and pending actions.

import { getSupabaseAdmin } from "@/lib/supabase";

export interface QueuedAction {
  id: string;
  propertyId: string | null;
  operatorId: string | null;
  actionType: string;
  title: string;
  reason: string | null;
  urgency: "low" | "medium" | "high" | "critical";
  recommendedOwner: string | null;
  approvalStatus: string;
  autoExecutable: boolean;
  sourceType: string | null;
  explanation: string | null;
  createdAt: string;
}

const URGENCY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

// ── getOperatorActionQueue ────────────────────────────────────────────────────

export async function getOperatorActionQueue(
  params: { operatorId?: string; propertyId?: string; urgency?: string; limit?: number }
): Promise<QueuedAction[]> {
  const db = getSupabaseAdmin();
  let query = db
    .from("action_queue")
    .select("*")
    .is("dismissed_at", null)
    .is("executed_at", null);

  if (params.operatorId) query = query.eq("operator_id", params.operatorId);
  if (params.propertyId) query = query.eq("property_id", params.propertyId);
  if (params.urgency)    query = query.eq("urgency", params.urgency);

  query = query.order("created_at", { ascending: false }).limit(params.limit ?? 50);

  const { data } = await query;
  const actions = (data ?? []) as QueuedAction[];
  return rankActions(actions);
}

// ── rankActions ───────────────────────────────────────────────────────────────

export function rankActions(actions: QueuedAction[]): QueuedAction[] {
  return [...actions].sort((a, b) => {
    const ua = URGENCY_ORDER[a.urgency] ?? 3;
    const ub = URGENCY_ORDER[b.urgency] ?? 3;
    if (ua !== ub) return ua - ub;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ── addToActionQueue ──────────────────────────────────────────────────────────

export async function addToActionQueue(params: {
  propertyId?: string;
  operatorId?: string;
  actionType: string;
  title: string;
  reason?: string;
  urgency: "low" | "medium" | "high" | "critical";
  recommendedOwner?: string;
  autoExecutable?: boolean;
  sourceType?: string;
  sourceId?: string;
  explanation?: string;
}): Promise<string> {
  const db = getSupabaseAdmin();
  const { data } = await db.from("action_queue").insert({
    property_id:       params.propertyId ?? null,
    operator_id:       params.operatorId ?? null,
    action_type:       params.actionType,
    title:             params.title,
    reason:            params.reason ?? null,
    urgency:           params.urgency,
    recommended_owner: params.recommendedOwner ?? null,
    approval_status:   "pending",
    auto_executable:   params.autoExecutable ?? false,
    source_type:       params.sourceType ?? null,
    source_id:         params.sourceId ?? null,
    explanation:       params.explanation ?? null,
  }).select("id").single();

  return data?.id ?? "";
}

// ── dismissAction ─────────────────────────────────────────────────────────────

export async function dismissAction(actionId: string): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("action_queue").update({ dismissed_at: new Date().toISOString() }).eq("id", actionId);
}

// ── approveAction ─────────────────────────────────────────────────────────────

export async function approveAction(actionId: string): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("action_queue").update({ approval_status: "approved" }).eq("id", actionId);
}

// ── populateQueueFromOrchestration ────────────────────────────────────────────
// Syncs orchestration actions into the central queue.

export async function populateQueueFromOrchestration(
  propertyId: string,
  operatorId: string,
  orchestrationRunId: string
): Promise<void> {
  const db = getSupabaseAdmin();

  const { data: actions } = await db
    .from("orchestration_actions")
    .select("*")
    .eq("run_id", orchestrationRunId)
    .eq("status", "pending");

  if (!actions || actions.length === 0) return;

  const URGENCY_MAP: Record<string, "low" | "medium" | "high" | "critical"> = {
    low:    "low",
    medium: "medium",
    high:   "high",
  };

  const rows = actions.map(a => ({
    property_id:       propertyId,
    operator_id:       operatorId,
    action_type:       a.action_type,
    title:             a.title,
    reason:            a.reasoning,
    urgency:           URGENCY_MAP[a.risk_level] ?? "medium",
    recommended_owner: a.auto_executable ? "ai" : "manager",
    approval_status:   a.auto_executable ? "auto_approved" : "pending",
    auto_executable:   a.auto_executable,
    source_type:       "orchestration",
    source_id:         orchestrationRunId,
    explanation:       a.description,
  }));

  await db.from("action_queue").insert(rows);
}
