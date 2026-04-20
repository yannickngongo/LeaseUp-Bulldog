import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { canAutoExecuteAction, queueActionForApproval } from "@/lib/autonomy";

const anthropic = new Anthropic();

interface CampaignOptimizationAction {
  id?: string;
  campaignId: string;
  actionType: string;
  title: string;
  description: string;
  expectedImpact: string;
  autoExecutable: boolean;
  executionStatus: "pending" | "approved" | "executed" | "dismissed";
}

interface CampaignOptimizationResult {
  campaignId: string;
  currentPerformance: Record<string, unknown>;
  actions: CampaignOptimizationAction[];
  optimizationScore: number;
  summary: string;
}

export async function analyzeCampaignOptimization(
  campaignId: string
): Promise<CampaignOptimizationResult> {
  const db = getSupabaseAdmin();

  const { data: campaign } = await db
    .from("campaigns")
    .select("*, properties(name, operator_id)")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("Campaign not found");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: leads } = await db
    .from("leads")
    .select("id, stage, created_at, source")
    .eq("property_id", campaign.property_id)
    .gte("created_at", thirtyDaysAgo);

  const { data: leadScores } = await db
    .from("lead_scores")
    .select("lead_id, intent_score, urgency_level")
    .in("lead_id", (leads ?? []).map((l) => l.id));

  const scoreMap = new Map((leadScores ?? []).map((s) => [s.lead_id, s]));

  const totalLeads = leads?.length ?? 0;
  const highIntentLeads = (leads ?? []).filter((l) => {
    const score = scoreMap.get(l.id);
    return score && score.intent_score >= 7;
  }).length;
  const conversions = (leads ?? []).filter((l) => l.stage === "leased").length;
  const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;
  const intentRate = totalLeads > 0 ? (highIntentLeads / totalLeads) * 100 : 0;

  const currentPerformance = {
    totalLeads,
    highIntentLeads,
    conversions,
    conversionRate: Math.round(conversionRate * 10) / 10,
    intentRate: Math.round(intentRate * 10) / 10,
    budgetSpent: campaign.budget_spent_cents ?? 0,
    budgetTotal: campaign.budget_cents ?? 0,
    channel: campaign.channel,
    daysActive: Math.floor(
      (Date.now() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24)
    ),
  };

  const prompt = `You are a real estate digital marketing optimizer.

Campaign: ${campaign.name ?? campaignId}
Channel: ${campaign.channel ?? "unknown"}
Special offer: ${campaign.special_offer ?? "none"}
Budget: $${((campaign.budget_cents ?? 0) / 100).toFixed(0)} total, $${((campaign.budget_spent_cents ?? 0) / 100).toFixed(0)} spent

Performance (last 30 days):
- Total leads: ${totalLeads}
- High-intent leads: ${highIntentLeads} (${intentRate.toFixed(1)}%)
- Conversions: ${conversions} (${conversionRate.toFixed(1)}%)
- Days active: ${currentPerformance.daysActive}

Generate 3-5 specific optimization actions. Respond with JSON only:
{
  "actions": [
    {
      "actionType": "adjust_budget | pause_campaign | update_copy | change_targeting | extend_offer | split_test",
      "title": "Short action title",
      "description": "What to do and why",
      "expectedImpact": "Expected result from this change",
      "autoExecutable": true | false
    }
  ],
  "optimizationScore": 0-100,
  "summary": "One sentence summary of campaign health and top priority"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { actions: [], optimizationScore: 50, summary: "" };

  const actions: CampaignOptimizationAction[] = (parsed.actions ?? []).map(
    (a: Omit<CampaignOptimizationAction, "campaignId" | "executionStatus">) => ({
      ...a,
      campaignId,
      executionStatus: "pending" as const,
    })
  );

  const operatorId = campaign.properties?.operator_id;

  for (const action of actions) {
    const { data: inserted } = await db
      .from("campaign_optimization_actions")
      .insert({
        campaign_id: campaignId,
        property_id: campaign.property_id,
        action_type: action.actionType,
        title: action.title,
        description: action.description,
        expected_impact: action.expectedImpact,
        auto_executable: action.autoExecutable,
        execution_status: "pending",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    action.id = inserted?.id;

    if (operatorId && action.autoExecutable) {
      const canAuto = await canAutoExecuteAction(operatorId, "campaign_optimization");
      if (!canAuto) {
        await queueActionForApproval({
          operatorId,
          propertyId: campaign.property_id,
          actionType: "campaign_optimization",
          title: action.title,
          description: action.description,
          urgency: "medium",
          sourceTable: "campaign_optimization_actions",
          sourceId: action.id ?? "",
        });
      }
    }
  }

  return {
    campaignId,
    currentPerformance,
    actions,
    optimizationScore: parsed.optimizationScore ?? 50,
    summary: parsed.summary ?? "",
  };
}

export async function generateCampaignActions(campaignId: string): Promise<CampaignOptimizationAction[]> {
  const result = await analyzeCampaignOptimization(campaignId);
  return result.actions;
}

export async function applyCampaignOptimization(actionId: string): Promise<{ ok: boolean; message: string }> {
  const db = getSupabaseAdmin();

  const { data: action } = await db
    .from("campaign_optimization_actions")
    .select("*, campaigns(channel, budget_cents, budget_spent_cents)")
    .eq("id", actionId)
    .single();

  if (!action) return { ok: false, message: "Action not found" };

  switch (action.action_type) {
    case "pause_campaign":
      await db.from("campaigns").update({ status: "paused" }).eq("id", action.campaign_id);
      break;
    case "adjust_budget":
      break;
    default:
      break;
  }

  await db
    .from("campaign_optimization_actions")
    .update({ execution_status: "executed", executed_at: new Date().toISOString() })
    .eq("id", actionId);

  return { ok: true, message: `Applied: ${action.title}` };
}
