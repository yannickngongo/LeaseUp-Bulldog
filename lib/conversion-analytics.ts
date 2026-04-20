// Conversion Analytics — track funnel drop-off and calculate per-stage rates.

import { getSupabaseAdmin } from "@/lib/supabase";

export type FunnelStage = "new" | "contacted" | "engaged" | "tour_scheduled" | "applied" | "won" | "lost";

const STAGE_ORDER: FunnelStage[] = ["new", "contacted", "engaged", "tour_scheduled", "applied", "won"];

export interface FunnelMetrics {
  propertyId: string;
  periodStart: string;
  periodEnd: string;
  totalLeads: number;
  newToReplyRate: number;
  replyToTourRate: number;
  tourToApplicationRate: number;
  applicationToLeaseRate: number;
  biggestDropOffStage: string;
  stageCounts: Record<string, number>;
}

export interface ConversionLeak {
  stage: string;
  dropOffRate: number;
  leadsLost: number;
  severity: "low" | "medium" | "high" | "critical";
}

// ── recordFunnelEvent ────────────────────────────────────────────────────────

export async function recordFunnelEvent(
  leadId: string,
  propertyId: string,
  fromStage: FunnelStage,
  toStage: FunnelStage
): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("funnel_events").insert({ lead_id: leadId, property_id: propertyId, from_stage: fromStage, to_stage: toStage });
}

// ── calculateFunnelMetrics ────────────────────────────────────────────────────

export async function calculateFunnelMetrics(
  propertyId: string,
  daysBack = 30
): Promise<FunnelMetrics> {
  const db = getSupabaseAdmin();

  const periodEnd   = new Date();
  const periodStart = new Date(periodEnd.getTime() - daysBack * 86400000);

  // Count leads per stage in period
  const { data: leads } = await db
    .from("leads")
    .select("status")
    .eq("property_id", propertyId)
    .gte("created_at", periodStart.toISOString());

  const stageCounts: Record<string, number> = {};
  for (const stage of STAGE_ORDER) stageCounts[stage] = 0;
  for (const lead of leads ?? []) {
    if (stageCounts[lead.status] !== undefined) stageCounts[lead.status]++;
  }

  const totalLeads            = leads?.length ?? 0;
  const contacted             = STAGE_ORDER.slice(1).reduce((s, st) => s + (stageCounts[st] ?? 0), 0);
  const engaged               = STAGE_ORDER.slice(2).reduce((s, st) => s + (stageCounts[st] ?? 0), 0);
  const tourScheduled         = STAGE_ORDER.slice(3).reduce((s, st) => s + (stageCounts[st] ?? 0), 0);
  const applied               = (stageCounts["applied"] ?? 0) + (stageCounts["won"] ?? 0);
  const won                   = stageCounts["won"] ?? 0;

  const rate = (n: number, d: number) => d === 0 ? 0 : Math.round((n / d) * 1000) / 10;

  const newToReplyRate          = rate(contacted,     totalLeads);
  const replyToTourRate         = rate(tourScheduled, contacted);
  const tourToApplicationRate   = rate(applied,       tourScheduled);
  const applicationToLeaseRate  = rate(won,           applied);

  const drops = [
    { stage: "new → contacted",         drop: 100 - newToReplyRate },
    { stage: "contacted → tour",         drop: 100 - replyToTourRate },
    { stage: "tour → application",       drop: 100 - tourToApplicationRate },
    { stage: "application → lease",      drop: 100 - applicationToLeaseRate },
  ];
  const biggestDropOff = drops.reduce((a, b) => b.drop > a.drop ? b : a);

  const metrics: FunnelMetrics = {
    propertyId,
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd:   periodEnd.toISOString().slice(0, 10),
    totalLeads,
    newToReplyRate,
    replyToTourRate,
    tourToApplicationRate,
    applicationToLeaseRate,
    biggestDropOffStage: biggestDropOff.stage,
    stageCounts,
  };

  // Persist
  await db.from("conversion_metrics").insert({
    property_id:                propertyId,
    period_start:               metrics.periodStart,
    period_end:                 metrics.periodEnd,
    new_to_reply_rate:          newToReplyRate,
    reply_to_tour_rate:         replyToTourRate,
    tour_to_application_rate:   tourToApplicationRate,
    application_to_lease_rate:  applicationToLeaseRate,
    biggest_drop_off_stage:     biggestDropOff.stage,
    total_leads:                totalLeads,
  });

  return metrics;
}

// ── identifyConversionLeaks ───────────────────────────────────────────────────

export async function identifyConversionLeaks(propertyId: string): Promise<ConversionLeak[]> {
  const metrics = await calculateFunnelMetrics(propertyId);

  const stages = [
    { stage: "new → contacted",    rate: metrics.newToReplyRate,         leads: metrics.totalLeads },
    { stage: "contacted → tour",   rate: metrics.replyToTourRate,        leads: metrics.stageCounts["contacted"] ?? 0 },
    { stage: "tour → application", rate: metrics.tourToApplicationRate,  leads: metrics.stageCounts["tour_scheduled"] ?? 0 },
    { stage: "application → lease",rate: metrics.applicationToLeaseRate, leads: (metrics.stageCounts["applied"] ?? 0) + (metrics.stageCounts["won"] ?? 0) },
  ];

  return stages.map(s => {
    const dropRate = 100 - s.rate;
    const leadsLost = Math.round((s.leads * dropRate) / 100);
    const severity: ConversionLeak["severity"] =
      dropRate > 80 ? "critical" :
      dropRate > 60 ? "high" :
      dropRate > 40 ? "medium" : "low";
    return { stage: s.stage, dropOffRate: dropRate, leadsLost, severity };
  }).sort((a, b) => b.dropOffRate - a.dropOffRate);
}
