// Autonomy — property-level operating mode: manual | assisted | autonomous.
// Controls which actions can be auto-executed vs. queued for approval.

import { getSupabaseAdmin } from "@/lib/supabase";

export type AutonomyMode = "manual" | "assisted" | "autonomous";

export type ActionType =
  | "increase_follow_up"
  | "strengthen_offer"
  | "launch_campaign"
  | "prioritize_leads"
  | "review_handoffs"
  | "adjust_messaging"
  | "increase_budget"
  | "decrease_budget"
  | "pause_campaign"
  | "human_review";

export type RiskLevel = "low" | "medium" | "high";

interface ActionDefinition {
  riskLevel: RiskLevel;
  allowedInAssisted: boolean;
  allowedInAutonomous: boolean;
  description: string;
}

const ACTION_REGISTRY: Record<ActionType, ActionDefinition> = {
  increase_follow_up:  { riskLevel: "low",    allowedInAssisted: true,  allowedInAutonomous: true,  description: "Increase follow-up cadence for active leads" },
  prioritize_leads:    { riskLevel: "low",    allowedInAssisted: true,  allowedInAutonomous: true,  description: "Re-rank lead priority queue" },
  review_handoffs:     { riskLevel: "low",    allowedInAssisted: true,  allowedInAutonomous: true,  description: "Flag open handoffs for human attention" },
  adjust_messaging:    { riskLevel: "medium", allowedInAssisted: false, allowedInAutonomous: true,  description: "Switch AI messaging angle" },
  strengthen_offer:    { riskLevel: "medium", allowedInAssisted: false, allowedInAutonomous: true,  description: "Suggest a stronger leasing special" },
  decrease_budget:     { riskLevel: "medium", allowedInAssisted: false, allowedInAutonomous: true,  description: "Reduce underperforming campaign budget" },
  increase_budget:     { riskLevel: "high",   allowedInAssisted: false, allowedInAutonomous: false, description: "Increase ad budget — requires approval always" },
  launch_campaign:     { riskLevel: "high",   allowedInAssisted: false, allowedInAutonomous: false, description: "Launch a new ad campaign — requires approval always" },
  pause_campaign:      { riskLevel: "high",   allowedInAssisted: false, allowedInAutonomous: false, description: "Pause an active campaign" },
  human_review:        { riskLevel: "low",    allowedInAssisted: true,  allowedInAutonomous: true,  description: "Flag item for human review" },
};

// ── getAutonomySettings ───────────────────────────────────────────────────────

export async function getAutonomySettings(propertyId: string): Promise<{
  mode: AutonomyMode;
  allowedAutoActions: ActionType[];
  budgetChangeLimitPct: number;
}> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("property_autonomy_settings")
    .select("*")
    .eq("property_id", propertyId)
    .single();

  if (!data) {
    return { mode: "manual", allowedAutoActions: [], budgetChangeLimitPct: 20 };
  }

  return {
    mode:                 data.autonomy_mode as AutonomyMode,
    allowedAutoActions:   (data.allowed_auto_actions ?? []) as ActionType[],
    budgetChangeLimitPct: data.budget_change_limit_pct ?? 20,
  };
}

// ── canAutoExecuteAction ──────────────────────────────────────────────────────

export async function canAutoExecuteAction(
  propertyId: string,
  actionType: ActionType
): Promise<{ allowed: boolean; reason: string }> {
  const settings = await getAutonomySettings(propertyId);
  const def      = ACTION_REGISTRY[actionType];

  if (!def) return { allowed: false, reason: "Unknown action type" };

  if (settings.mode === "manual") {
    return { allowed: false, reason: "Property is in manual mode — all actions require approval" };
  }

  if (settings.mode === "assisted") {
    if (!def.allowedInAssisted) {
      return { allowed: false, reason: `${actionType} requires approval in assisted mode` };
    }
    if (settings.allowedAutoActions.length > 0 && !settings.allowedAutoActions.includes(actionType)) {
      return { allowed: false, reason: "Action not in allowed auto-action list" };
    }
    return { allowed: true, reason: "Permitted in assisted mode" };
  }

  if (settings.mode === "autonomous") {
    if (!def.allowedInAutonomous) {
      return { allowed: false, reason: `${actionType} always requires approval regardless of autonomy mode` };
    }
    return { allowed: true, reason: "Permitted in autonomous mode" };
  }

  return { allowed: false, reason: "Unknown autonomy mode" };
}

// ── queueActionForApproval ────────────────────────────────────────────────────

export async function queueActionForApproval(params: {
  propertyId: string;
  operatorId: string;
  actionType: ActionType;
  title: string;
  description: string;
  reasoning: string;
  sourceType?: string;
  sourceId?: string;
}): Promise<string> {
  const db  = getSupabaseAdmin();
  const def = ACTION_REGISTRY[params.actionType];

  const { data } = await db.from("orchestration_actions").insert({
    property_id:     params.propertyId,
    action_type:     params.actionType,
    title:           params.title,
    description:     params.description,
    risk_level:      def?.riskLevel ?? "medium",
    auto_executable: false,
    reasoning:       params.reasoning,
    status:          "pending",
  }).select("id").single();

  // Also add to action_queue
  await db.from("action_queue").insert({
    property_id:      params.propertyId,
    operator_id:      params.operatorId,
    action_type:      params.actionType,
    title:            params.title,
    reason:           params.reasoning,
    urgency:          def?.riskLevel === "high" ? "high" : def?.riskLevel === "medium" ? "medium" : "low",
    recommended_owner: "manager",
    approval_status:  "pending",
    auto_executable:  false,
    source_type:      params.sourceType ?? "orchestration",
    source_id:        params.sourceId ?? null,
    explanation:      params.description,
  });

  return data?.id ?? "";
}

// ── executeApprovedAction ─────────────────────────────────────────────────────

export async function executeApprovedAction(actionId: string, approvedBy: string): Promise<void> {
  const db = getSupabaseAdmin();

  await db.from("orchestration_actions").update({
    status:      "executed",
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
    executed_at: new Date().toISOString(),
  }).eq("id", actionId);

  // Actions execute their side effects at the API layer — this records the approval
}

// ── setAutonomyMode ───────────────────────────────────────────────────────────

export async function setAutonomyMode(
  propertyId: string,
  mode: AutonomyMode,
  allowedAutoActions: ActionType[] = [],
  budgetChangeLimitPct = 20
): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("property_autonomy_settings").upsert({
    property_id:             propertyId,
    autonomy_mode:           mode,
    allowed_auto_actions:    allowedAutoActions,
    budget_change_limit_pct: budgetChangeLimitPct,
    updated_at:              new Date().toISOString(),
  }, { onConflict: "property_id" });
}

export { ACTION_REGISTRY };
