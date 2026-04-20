// Optimize Property — trigger orchestration, surface top 3–5 fixes, produce a plan.

import { getSupabaseAdmin } from "@/lib/supabase";
import { runPropertyOrchestration, OrchestrationAction } from "@/lib/orchestration";
import { canAutoExecuteAction, ActionType } from "@/lib/autonomy";

export interface OptimizationPlanItem {
  rank: number;
  actionType: string;
  title: string;
  description: string;
  riskLevel: string;
  executionStatus: "recommendation_only" | "ready_for_approval" | "auto_executable";
  reasoning: string;
}

export interface OptimizationPlan {
  propertyId: string;
  orchestrationRunId: string;
  riskLevel: string;
  summary: string;
  items: OptimizationPlanItem[];
  createdAt: string;
}

// ── generateOptimizationPlan ──────────────────────────────────────────────────

export async function generateOptimizationPlan(propertyId: string): Promise<OptimizationPlan> {
  // Run orchestration to get current state + recommended actions
  const orchestration = await runPropertyOrchestration(propertyId);

  // Score actions by impact and select top 5
  const topActions = orchestration.recommendedActions.slice(0, 5);

  const items: OptimizationPlanItem[] = [];
  for (let i = 0; i < topActions.length; i++) {
    const action = topActions[i];
    const { allowed } = await canAutoExecuteAction(propertyId, action.actionType as ActionType);

    const executionStatus: OptimizationPlanItem["executionStatus"] =
      allowed ? "auto_executable" :
      action.riskLevel === "low" ? "ready_for_approval" :
      "recommendation_only";

    items.push({
      rank:            i + 1,
      actionType:      action.actionType,
      title:           action.title,
      description:     action.description,
      riskLevel:       action.riskLevel,
      executionStatus,
      reasoning:       action.reasoning,
    });
  }

  const plan: OptimizationPlan = {
    propertyId,
    orchestrationRunId: orchestration.runId,
    riskLevel:          orchestration.riskLevel,
    summary:            orchestration.summary,
    items,
    createdAt:          new Date().toISOString(),
  };

  // Persist
  const db = getSupabaseAdmin();
  await db.from("optimize_property_runs").insert({
    property_id:          propertyId,
    orchestration_run_id: orchestration.runId,
    plan:                 items,
    status:               "completed",
  });

  return plan;
}

// ── optimizeProperty ──────────────────────────────────────────────────────────
// Public entry point — runs the plan and returns it.

export async function optimizeProperty(propertyId: string): Promise<OptimizationPlan> {
  return generateOptimizationPlan(propertyId);
}
