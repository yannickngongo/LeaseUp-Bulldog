// GET /api/analytics/performance?days=30
// Operator-facing analytics: lead volume, response time, conversion, source breakdown,
// and lease attribution for the last N days. Used by /reports/performance page.

import { NextRequest, NextResponse } from "next/server";
import { resolveCallerContext } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days  = Math.min(365, Math.max(1, parseInt(new URL(req.url).searchParams.get("days") ?? "30", 10) || 30));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const db = getSupabaseAdmin();

  // 1. Operator's properties (tenant scope)
  const { data: properties } = await db
    .from("properties")
    .select("id")
    .eq("operator_id", ctx.operatorId);
  const propertyIds = (properties ?? []).map(p => p.id);
  if (propertyIds.length === 0) {
    return NextResponse.json({
      days, since,
      leadVolume:    0,
      bySource:      [],
      byStatus:      [],
      avgResponseSec:null,
      conversion:    { newToWon: 0, newToWonPct: 0 },
      leases:        { count: 0, billable: 0, totalRent: 0, totalFees: 0 },
    });
  }

  // 2. Leads for window
  const { data: leads } = await db
    .from("leads")
    .select("id, status, source, created_at, first_contact_date")
    .in("property_id", propertyIds)
    .gte("created_at", since);

  const allLeads = leads ?? [];

  // 3. Source breakdown
  const sourceCounts = new Map<string, number>();
  for (const l of allLeads) {
    const s = (l.source as string | null) ?? "unknown";
    sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
  }
  const bySource = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // 4. Status breakdown
  const statusCounts = new Map<string, number>();
  for (const l of allLeads) {
    const s = (l.status as string | null) ?? "unknown";
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  }
  const byStatus = Array.from(statusCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // 5. Avg response time (created_at -> first_contact_date)
  const responseTimes = allLeads
    .filter(l => l.first_contact_date && l.created_at)
    .map(l => {
      const diff = new Date(l.first_contact_date as string).getTime() - new Date(l.created_at as string).getTime();
      return diff / 1000;  // seconds
    })
    .filter(s => s >= 0);  // sanity

  const avgResponseSec = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  // 6. Conversion: new -> won
  const wonCount   = allLeads.filter(l => l.status === "won").length;
  const newToWonPct = allLeads.length > 0 ? (wonCount / allLeads.length) * 100 : 0;

  // 7. Leases (real ones from /leases table)
  const { data: leases } = await db
    .from("leases")
    .select("id, rent_amount, is_billable, lease_signed_date")
    .in("property_id", propertyIds)
    .gte("lease_signed_date", since.slice(0, 10));

  const leaseRows = leases ?? [];
  const billableCount = leaseRows.filter(l => l.is_billable).length;
  const totalRent     = leaseRows.reduce((s, l) => s + (l.rent_amount ?? 0), 0);

  // Per-lease fee from billing_subscriptions
  const { data: sub } = await db
    .from("billing_subscriptions")
    .select("performance_fee_per_lease")
    .eq("operator_id", ctx.operatorId)
    .maybeSingle();
  const feePerLease = sub?.performance_fee_per_lease ?? 20000;
  const totalFees   = billableCount * feePerLease;

  return NextResponse.json({
    days,
    since,
    leadVolume:     allLeads.length,
    bySource,
    byStatus,
    avgResponseSec,
    conversion: {
      newToWon:    wonCount,
      newToWonPct: Math.round(newToWonPct * 10) / 10,
    },
    leases: {
      count:      leaseRows.length,
      billable:   billableCount,
      totalRent,    // cents
      totalFees,    // cents
    },
  });
}
