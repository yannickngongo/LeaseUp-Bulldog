// Orchestration Engine — central decision layer across the entire property system.
// Reads all intelligence modules and produces a unified findings + action plan.

import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { calculateFunnelMetrics, identifyConversionLeaks } from "@/lib/conversion-analytics";
import { predictOccupancy } from "@/lib/occupancy-prediction";
import { generateInsights } from "@/lib/strategic-insights";
import { detectRisk } from "@/lib/intervention";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function ai(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export interface OrchestrationFinding {
  type: "issue" | "opportunity";
  title: string;
  description: string;
  impactLevel: "low" | "medium" | "high" | "critical";
  data?: Record<string, unknown>;
}

export interface OrchestrationAction {
  actionType: string;
  title: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  autoExecutable: boolean;
  reasoning: string;
}

export interface OrchestrationResult {
  runId: string;
  propertyId: string;
  summary: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  confidenceScore: number;
  issues: OrchestrationFinding[];
  opportunities: OrchestrationFinding[];
  recommendedActions: OrchestrationAction[];
  createdAt: string;
}

// ── summarizePropertyState ────────────────────────────────────────────────────

export async function summarizePropertyState(propertyId: string): Promise<Record<string, unknown>> {
  const db = getSupabaseAdmin();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    funnel,
    forecast,
    risk,
    { data: leads },
    { data: handoffs },
    { data: aiConfig },
    { data: campaigns },
  ] = await Promise.all([
    calculateFunnelMetrics(propertyId),
    predictOccupancy(propertyId),
    detectRisk(propertyId),
    db.from("leads").select("status, created_at, human_takeover, opt_out").eq("property_id", propertyId).gte("created_at", thirtyDaysAgo),
    db.from("handoff_events").select("status").eq("property_id", propertyId).eq("status", "open"),
    db.from("property_ai_configs").select("*").eq("property_id", propertyId).single(),
    db.from("campaigns").select("status, leads_generated").eq("property_id", propertyId).limit(5),
  ]);

  const openHandoffs     = handoffs?.length ?? 0;
  const humanTakeoverLeads = (leads ?? []).filter(l => l.human_takeover).length;
  const activeCampaigns  = (campaigns ?? []).filter(c => c.status === "active").length;

  return {
    funnel,
    forecast,
    risk,
    openHandoffs,
    humanTakeoverLeads,
    activeCampaigns,
    hasAIConfig: !!aiConfig,
    totalLeads30d: leads?.length ?? 0,
  };
}

// ── generateRecommendedActions ────────────────────────────────────────────────

export async function generateRecommendedActions(
  propertyId: string,
  state: Record<string, unknown>
): Promise<OrchestrationAction[]> {
  const funnel   = state.funnel   as Record<string, unknown>;
  const forecast = state.forecast as Record<string, unknown>;
  const risk     = state.risk     as Record<string, unknown>;

  const response = await ai().messages.create({
    model:      MODEL,
    max_tokens: 1200,
    system: `You are an AI leasing operations manager. Given property signals, generate 3–6 recommended actions.
Return ONLY valid JSON array:
[{
  "actionType": string,
  "title": string,
  "description": string,
  "riskLevel": "low" | "medium" | "high",
  "autoExecutable": boolean,
  "reasoning": string
}]
actionType values: increase_follow_up | strengthen_offer | launch_campaign | prioritize_leads | review_handoffs | adjust_messaging | increase_budget | human_review
autoExecutable: true only for low-risk informational or follow-up-intensity changes`,
    messages: [{
      role:    "user",
      content: `Occupancy risk: ${(risk as { riskScore?: number }).riskScore ?? "unknown"}
Risk level: ${(forecast as { riskLevel?: string }).riskLevel ?? "unknown"}
30d forecast: ${(forecast as { forecast30d?: number }).forecast30d ?? "unknown"}%
Biggest drop-off: ${(funnel as { biggestDropOffStage?: string }).biggestDropOffStage ?? "unknown"}
Total leads 30d: ${(funnel as { totalLeads?: number }).totalLeads ?? 0}
Open handoffs: ${state.openHandoffs}
Active campaigns: ${state.activeCampaigns}
Human takeover leads: ${state.humanTakeoverLeads}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── runPropertyOrchestration ──────────────────────────────────────────────────

export async function runPropertyOrchestration(propertyId: string): Promise<OrchestrationResult> {
  const db = getSupabaseAdmin();

  // Gather all signals in parallel
  const [state, leaks, insights] = await Promise.all([
    summarizePropertyState(propertyId),
    identifyConversionLeaks(propertyId),
    generateInsights(propertyId),
  ]);

  const forecast = state.forecast as Record<string, unknown>;
  const risk     = state.risk     as Record<string, unknown>;

  // Build findings
  const issues: OrchestrationFinding[] = [];
  const opportunities: OrchestrationFinding[] = [];

  // Conversion leaks → issues
  for (const leak of leaks) {
    if (leak.severity === "critical" || leak.severity === "high") {
      issues.push({
        type:        "issue",
        title:       `High drop-off at ${leak.stage}`,
        description: `${leak.dropOffRate.toFixed(0)}% of leads are lost at this stage (${leak.leadsLost} leads).`,
        impactLevel: leak.severity,
        data:        { ...leak },
      });
    }
  }

  // Occupancy risk → issues
  if (["high", "critical"].includes(String(forecast.riskLevel))) {
    issues.push({
      type:        "issue",
      title:       "Occupancy decline risk detected",
      description: `30-day forecast is ${(forecast.forecast30d as number)?.toFixed(1)}%. Risk level: ${forecast.riskLevel}.`,
      impactLevel: forecast.riskLevel as OrchestrationFinding["impactLevel"],
    });
  }

  // Open handoffs → issues
  if ((state.openHandoffs as number) > 0) {
    issues.push({
      type:        "issue",
      title:       `${state.openHandoffs} open human handoff(s)`,
      description: "Leads in human takeover mode are not receiving AI follow-up.",
      impactLevel: "medium",
    });
  }

  // Opportunities from insights
  for (const insight of insights.slice(0, 3)) {
    opportunities.push({
      type:        "opportunity",
      title:       insight.title,
      description: insight.explanation,
      impactLevel: insight.impactLevel as OrchestrationFinding["impactLevel"],
    });
  }

  // Generate recommended actions
  const recommendedActions = await generateRecommendedActions(propertyId, state);

  // Determine overall risk level
  const riskLevel: OrchestrationResult["riskLevel"] =
    issues.some(i => i.impactLevel === "critical") ? "critical" :
    issues.some(i => i.impactLevel === "high")     ? "high"     :
    issues.length > 2                               ? "medium"   : "low";

  const riskScore = (risk as { riskScore?: number }).riskScore ?? 0;
  const confidenceScore = Math.min(100, 50 + Math.min(50, issues.length * 10 + opportunities.length * 5));

  const summary = `Property has ${issues.length} issue(s) and ${opportunities.length} opportunity(ies). ` +
    `Occupancy risk: ${forecast.riskLevel}. Top action: ${recommendedActions[0]?.title ?? "None identified"}.`;

  // Persist run
  const { data: run } = await db.from("orchestration_runs").insert({
    property_id:      propertyId,
    summary,
    risk_level:       riskLevel,
    confidence_score: confidenceScore,
    issues:           issues,
    opportunities:    opportunities,
  }).select("id").single();

  const runId = run?.id ?? "unknown";

  // Persist findings
  const allFindings = [...issues, ...opportunities];
  if (allFindings.length > 0) {
    await db.from("orchestration_findings").insert(
      allFindings.map(f => ({
        run_id:       runId,
        finding_type: f.type,
        title:        f.title,
        description:  f.description,
        impact_level: f.impactLevel,
        data:         f.data ?? {},
      }))
    );
  }

  // Persist actions
  if (recommendedActions.length > 0) {
    await db.from("orchestration_actions").insert(
      recommendedActions.map(a => ({
        run_id:          runId,
        property_id:     propertyId,
        action_type:     a.actionType,
        title:           a.title,
        description:     a.description,
        risk_level:      a.riskLevel,
        auto_executable: a.autoExecutable,
        reasoning:       a.reasoning,
        status:          "pending",
      }))
    );
  }

  return {
    runId,
    propertyId,
    summary,
    riskLevel,
    confidenceScore,
    issues,
    opportunities,
    recommendedActions,
    createdAt: new Date().toISOString(),
  };
}
