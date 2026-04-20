// Closed-Loop Learning — identify patterns from campaign and lease performance.

import { getSupabaseAdmin } from "@/lib/supabase";

export interface CampaignPerformanceSummary {
  operatorId: string;
  patterns: PatternRecord[];
  topPerformingChannels: string[];
  topPerformingOfferTypes: string[];
  weakestPatterns: PatternRecord[];
}

export interface PatternRecord {
  patternType: string;
  patternValue: string;
  avgLeadQuality: number;
  avgConversionRate: number;
  leaseCount: number;
  sampleSize: number;
  confidenceScore: number;
}

// ── analyzeCampaignPerformance ────────────────────────────────────────────────

export async function analyzeCampaignPerformance(operatorId: string): Promise<CampaignPerformanceSummary> {
  const db = getSupabaseAdmin();

  // Load campaigns with lead scores
  const { data: campaigns } = await db
    .from("campaigns")
    .select("id, property_id, recommended_channels, messaging_angle, status, leads_generated")
    .eq("operator_id", operatorId)
    .in("status", ["active", "completed", "approved"]);

  if (!campaigns || campaigns.length === 0) {
    return { operatorId, patterns: [], topPerformingChannels: [], topPerformingOfferTypes: [], weakestPatterns: [] };
  }

  const patternMap = new Map<string, {
    totalLeadQuality: number; totalConversion: number; leases: number; samples: number;
  }>();

  for (const campaign of campaigns) {
    // Load leads from this campaign
    const { data: leads } = await db
      .from("leads")
      .select("id, status")
      .eq("property_id", campaign.property_id)
      .eq("campaign_id", campaign.id)
      .limit(100);

    if (!leads || leads.length === 0) continue;

    const { data: scores } = await db
      .from("lead_scores")
      .select("intent_score, likelihood_to_lease")
      .in("lead_id", leads.map(l => l.id));

    const wonLeads      = leads.filter(l => l.status === "won").length;
    const conversionRate = leads.length > 0 ? wonLeads / leads.length : 0;
    const avgQuality    = scores && scores.length > 0
      ? scores.reduce((s, sc) => s + (sc.intent_score ?? 50), 0) / scores.length
      : 50;

    // Record channel patterns
    for (const channel of (campaign.recommended_channels ?? [])) {
      const key = `channel:${channel}`;
      const existing = patternMap.get(key) ?? { totalLeadQuality: 0, totalConversion: 0, leases: 0, samples: 0 };
      patternMap.set(key, {
        totalLeadQuality: existing.totalLeadQuality + avgQuality,
        totalConversion:  existing.totalConversion  + conversionRate,
        leases:           existing.leases           + wonLeads,
        samples:          existing.samples          + 1,
      });
    }

    // Record messaging angle pattern
    if (campaign.messaging_angle) {
      const angle = campaign.messaging_angle.slice(0, 50);
      const key   = `messaging_angle:${angle}`;
      const existing = patternMap.get(key) ?? { totalLeadQuality: 0, totalConversion: 0, leases: 0, samples: 0 };
      patternMap.set(key, {
        totalLeadQuality: existing.totalLeadQuality + avgQuality,
        totalConversion:  existing.totalConversion  + conversionRate,
        leases:           existing.leases           + wonLeads,
        samples:          existing.samples          + 1,
      });
    }
  }

  const patterns: PatternRecord[] = [];
  for (const [key, data] of patternMap.entries()) {
    const [type, value] = key.split(/:(.+)/);
    const avgQuality    = data.samples > 0 ? data.totalLeadQuality / data.samples : 0;
    const avgConversion = data.samples > 0 ? data.totalConversion  / data.samples : 0;
    const confidence    = Math.min(100, data.samples * 20);

    const record: PatternRecord = {
      patternType:       type,
      patternValue:      value,
      avgLeadQuality:    Math.round(avgQuality * 10) / 10,
      avgConversionRate: Math.round(avgConversion * 1000) / 10,
      leaseCount:        data.leases,
      sampleSize:        data.samples,
      confidenceScore:   confidence,
    };
    patterns.push(record);

    // Upsert into campaign_patterns
    await db.from("campaign_patterns").upsert({
      operator_id:         operatorId,
      pattern_type:        record.patternType,
      pattern_value:       record.patternValue,
      avg_lead_quality:    record.avgLeadQuality,
      avg_conversion_rate: record.avgConversionRate,
      lease_count:         record.leaseCount,
      sample_size:         record.sampleSize,
      confidence_score:    record.confidenceScore,
      updated_at:          new Date().toISOString(),
    }, { onConflict: "operator_id,pattern_type,pattern_value" });
  }

  const channelPatterns  = patterns.filter(p => p.patternType === "channel").sort((a, b) => b.avgConversionRate - a.avgConversionRate);
  const messagingPatterns = patterns.filter(p => p.patternType === "messaging_angle").sort((a, b) => b.avgConversionRate - a.avgConversionRate);

  return {
    operatorId,
    patterns,
    topPerformingChannels:   channelPatterns.slice(0, 3).map(p => p.patternValue),
    topPerformingOfferTypes: messagingPatterns.slice(0, 2).map(p => p.patternValue),
    weakestPatterns:         patterns.filter(p => p.avgConversionRate < 5 && p.sampleSize >= 2),
  };
}
