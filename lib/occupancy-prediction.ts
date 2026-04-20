// Occupancy Prediction — forecast 7/14/30-day occupancy and assign risk level.

import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";

const MODEL = "claude-haiku-4-5-20251001";

let _client: Anthropic | null = null;
function ai(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export interface OccupancyForecast {
  propertyId: string;
  currentOccupancyPct: number;
  forecast7d: number;
  forecast14d: number;
  forecast30d: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  confidenceScore: number;
  reasoning: string;
}

// ── predictOccupancy ──────────────────────────────────────────────────────────

export async function predictOccupancy(propertyId: string): Promise<OccupancyForecast> {
  const db = getSupabaseAdmin();

  // Gather signals
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    { data: property },
    { data: leads },
    { data: recentLeases },
    { data: activeLeads },
  ] = await Promise.all([
    db.from("properties").select("*").eq("id", propertyId).single(),
    db.from("leads").select("status, created_at").eq("property_id", propertyId).gte("created_at", thirtyDaysAgo),
    db.from("leases").select("lease_signed_date").eq("property_id", propertyId).gte("lease_signed_date", thirtyDaysAgo).limit(20),
    db.from("leads").select("status").eq("property_id", propertyId).in("status", ["applied", "tour_scheduled"]),
  ]);

  const leadsByStatus = (leads ?? []).reduce((acc: Record<string, number>, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalLeads30d    = leads?.length ?? 0;
  const applicants30d    = (leadsByStatus["applied"] ?? 0) + (leadsByStatus["won"] ?? 0);
  const leasesSigned30d  = recentLeases?.length ?? 0;
  const pipelineStrength = activeLeads?.length ?? 0;

  const applicationRate = totalLeads30d > 0 ? applicants30d / totalLeads30d : 0;
  const leaseRate       = applicants30d > 0 ? leasesSigned30d / applicants30d : 0;

  // Heuristic current occupancy (placeholder — would use real unit data in production)
  const currentOccupancyPct = 85 + Math.min(10, leasesSigned30d * 2) - Math.max(0, (30 - totalLeads30d) * 0.5);
  const clampedOccupancy = Math.min(100, Math.max(60, currentOccupancyPct));

  const response = await ai().messages.create({
    model:      MODEL,
    max_tokens: 500,
    system: `You are a real estate occupancy analyst. Given leasing signals, forecast occupancy for the next 7, 14, and 30 days.
These are heuristic estimates. Be realistic and slightly conservative.
Return ONLY valid JSON:
{
  "forecast7d": number,
  "forecast14d": number,
  "forecast30d": number,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "confidenceScore": number,
  "reasoning": "1-2 sentences"
}
riskLevel: critical < 80%, high < 85%, medium < 90%, low >= 90%`,
    messages: [{
      role:    "user",
      content: `Current occupancy: ${clampedOccupancy.toFixed(1)}%
New leads (30d): ${totalLeads30d}
Application rate: ${(applicationRate * 100).toFixed(1)}%
Lease rate: ${(leaseRate * 100).toFixed(1)}%
Leases signed (30d): ${leasesSigned30d}
Active pipeline (applied + tour): ${pipelineStrength}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  let result: Omit<OccupancyForecast, "propertyId" | "currentOccupancyPct">;
  try {
    result = JSON.parse(text);
  } catch {
    result = {
      forecast7d: clampedOccupancy, forecast14d: clampedOccupancy - 1, forecast30d: clampedOccupancy - 2,
      riskLevel: "medium", confidenceScore: 40, reasoning: "Unable to generate forecast.",
    };
  }

  const forecast: OccupancyForecast = {
    propertyId, currentOccupancyPct: clampedOccupancy, ...result,
  };

  await db.from("occupancy_forecasts").insert({
    property_id:            propertyId,
    forecast_date:          new Date().toISOString().slice(0, 10),
    current_occupancy_pct:  forecast.currentOccupancyPct,
    forecast_7d_pct:        forecast.forecast7d,
    forecast_14d_pct:       forecast.forecast14d,
    forecast_30d_pct:       forecast.forecast30d,
    risk_level:             forecast.riskLevel,
    confidence_score:       forecast.confidenceScore,
    reasoning:              forecast.reasoning,
  });

  return forecast;
}
