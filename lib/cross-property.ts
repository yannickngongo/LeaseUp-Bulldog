// Cross-Property Learning — detect reusable patterns and transfer recommendations.

import { getSupabaseAdmin } from "@/lib/supabase";

export interface CrossPropertyInsight {
  sourcePropertyId: string;
  sourcePropertyName: string;
  targetPropertyId: string;
  targetPropertyName: string;
  insightType: "offer_transfer" | "channel_transfer" | "messaging_transfer";
  description: string;
  confidenceScore: number;
}

// ── analyzeCrossPropertyPatterns ──────────────────────────────────────────────

export async function analyzeCrossPropertyPatterns(operatorId: string): Promise<CrossPropertyInsight[]> {
  const db = getSupabaseAdmin();

  const { data: properties } = await db
    .from("properties")
    .select("id, name")
    .eq("operator_id", operatorId);

  if (!properties || properties.length < 2) return [];

  const { data: patterns } = await db
    .from("campaign_patterns")
    .select("*")
    .eq("operator_id", operatorId)
    .gte("sample_size", 2)
    .order("avg_conversion_rate", { ascending: false });

  if (!patterns || patterns.length === 0) return [];

  const insights: CrossPropertyInsight[] = [];
  const bestPatterns = patterns.slice(0, 5);

  for (const best of bestPatterns) {
    // Find the source property (highest performing for this pattern)
    const { data: sourceCampaigns } = await db
      .from("campaigns")
      .select("property_id")
      .eq("operator_id", operatorId)
      .limit(1);

    const sourcePropertyId = best.property_id ?? sourceCampaigns?.[0]?.property_id;
    if (!sourcePropertyId) continue;

    const sourceProperty = properties.find(p => p.id === sourcePropertyId);
    if (!sourceProperty) continue;

    // Recommend transferring to other properties
    for (const target of properties) {
      if (target.id === sourcePropertyId) continue;

      const insightType: CrossPropertyInsight["insightType"] =
        best.pattern_type === "channel"         ? "channel_transfer"    :
        best.pattern_type === "messaging_angle" ? "messaging_transfer"  :
        "offer_transfer";

      const description = insightType === "channel_transfer"
        ? `"${best.pattern_value}" channel converts at ${best.avg_conversion_rate.toFixed(1)}% at ${sourceProperty.name}. Consider expanding to ${target.name}.`
        : insightType === "messaging_transfer"
        ? `Messaging angle "${best.pattern_value.slice(0, 60)}..." drives ${best.avg_conversion_rate.toFixed(1)}% conversions. Recommend testing at ${target.name}.`
        : `High-performing offer pattern from ${sourceProperty.name} (${best.avg_conversion_rate.toFixed(1)}% conversion). Adapt for ${target.name}.`;

      insights.push({
        sourcePropertyId,
        sourcePropertyName: sourceProperty.name,
        targetPropertyId:   target.id,
        targetPropertyName: target.name,
        insightType,
        description,
        confidenceScore: best.confidence_score,
      });

      // Persist
      await db.from("cross_property_insights").insert({
        operator_id:        operatorId,
        source_property_id: sourcePropertyId,
        target_property_id: target.id,
        insight_type:       insightType,
        description,
        confidence_score:   best.confidence_score,
      });
    }
  }

  return insights.slice(0, 10);
}

// ── recommendPatternTransfer ──────────────────────────────────────────────────

export async function recommendPatternTransfer(
  sourcePropertyId: string,
  targetPropertyId: string
): Promise<CrossPropertyInsight[]> {
  const db = getSupabaseAdmin();

  const { data } = await db
    .from("cross_property_insights")
    .select("*")
    .eq("source_property_id", sourcePropertyId)
    .eq("target_property_id", targetPropertyId)
    .order("confidence_score", { ascending: false });

  if (!data) return [];

  return data.map(r => ({
    sourcePropertyId:   r.source_property_id,
    sourcePropertyName: r.source_property_name ?? "",
    targetPropertyId:   r.target_property_id,
    targetPropertyName: r.target_property_name ?? "",
    insightType:        r.insight_type,
    description:        r.description,
    confidenceScore:    r.confidence_score,
  }));
}
