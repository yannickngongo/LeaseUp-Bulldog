// Billing and performance fee logic.
// All monetary amounts are in cents (integers) — never floats.

import { getSupabaseAdmin } from "@/lib/supabase";
import type { RecordLeasePayload, Lease, PerformanceFee, BillingPeriod } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ATTRIBUTION_WINDOW_DAYS = 30;
const PERFORMANCE_FEE_CENTS = 20000; // $200

// ─── recordLease ──────────────────────────────────────────────────────────────
// Creates a lease row, evaluates attribution, and fires a performance_fee if billable.

export async function recordLease(payload: RecordLeasePayload): Promise<Lease> {
  const db = getSupabaseAdmin();

  // Fetch the lead to get attribution timestamps
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .select("first_contact_date, attribution_window_end, status")
    .eq("id", payload.lead_id)
    .single();

  if (leadErr || !lead) throw new Error(`Lead not found: ${payload.lead_id}`);

  // Evaluate attribution
  const isBillable = evaluateAttribution(
    payload.attribution_source ?? "lub",
    payload.lease_signed_date,
    lead.attribution_window_end ?? null
  );

  const { data: lease, error: leaseErr } = await db
    .from("leases")
    .insert({
      lead_id:                payload.lead_id,
      property_id:            payload.property_id,
      operator_id:            payload.operator_id,
      lease_signed_date:      payload.lease_signed_date,
      rent_amount:            payload.rent_amount,
      unit_number:            payload.unit_number ?? null,
      lease_start_date:       payload.lease_start_date ?? null,
      lease_end_date:         payload.lease_end_date ?? null,
      attribution_source:     payload.attribution_source ?? "lub",
      created_by:             payload.created_by,
      first_contact_date:     lead.first_contact_date ?? null,
      attribution_window_end: lead.attribution_window_end ?? null,
      is_billable:            isBillable,
      notes:                  payload.notes ?? null,
    })
    .select()
    .single();

  if (leaseErr || !lease) throw new Error(`Failed to create lease: ${leaseErr?.message}`);

  // Mark lead as won
  await db.from("leads").update({ status: "won" }).eq("id", payload.lead_id);

  // Cancel all pending follow-up tasks for this lead
  await db
    .from("follow_up_tasks")
    .update({ status: "cancelled", cancelled_reason: "lease_signed", cancelled_at: new Date().toISOString() })
    .eq("lead_id", payload.lead_id)
    .eq("status", "pending");

  // Create performance fee if billable
  if (isBillable) {
    const billingMonth = payload.lease_signed_date.slice(0, 7); // 'YYYY-MM'
    await db.from("performance_fees").insert({
      lease_id:     lease.id,
      operator_id:  payload.operator_id,
      property_id:  payload.property_id,
      amount:       PERFORMANCE_FEE_CENTS,
      billing_month: billingMonth,
      status:       "pending",
    });
  }

  await db.from("activity_logs").insert({
    lead_id:     payload.lead_id,
    property_id: payload.property_id,
    action:      isBillable ? "lease_recorded_billable" : "lease_recorded_non_billable",
    actor:       "system",
    metadata:    {
      lease_id:          lease.id,
      is_billable:       isBillable,
      attribution_source: payload.attribution_source ?? "lub",
      rent_amount:       payload.rent_amount,
    },
  });

  return lease as Lease;
}

// ─── evaluateAttribution ──────────────────────────────────────────────────────
// Pure function — no DB calls. Returns true if the lease is LUB-billable.

export function evaluateAttribution(
  attributionSource: string,
  leaseSignedDate: string,
  attributionWindowEnd: string | null
): boolean {
  if (attributionSource !== "lub") return false;
  if (!attributionWindowEnd) return false;
  return new Date(leaseSignedDate) <= new Date(attributionWindowEnd);
}

// ─── setFirstContactDate ──────────────────────────────────────────────────────
// Called when the first outbound message is sent to a lead.
// Idempotent — only sets if not already set.

export async function setFirstContactDate(leadId: string): Promise<void> {
  const db = getSupabaseAdmin();
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + ATTRIBUTION_WINDOW_DAYS);

  // Use update with a condition so it's idempotent
  await db
    .from("leads")
    .update({
      first_contact_date:     now.toISOString(),
      attribution_window_end: windowEnd.toISOString(),
    })
    .eq("id", leadId)
    .is("first_contact_date", null); // only set if not already set
}

// ─── getPropertyPerformanceSummary ────────────────────────────────────────────

export async function getPropertyPerformanceSummary(
  propertyId: string,
  billingMonth: string // 'YYYY-MM'
) {
  const db = getSupabaseAdmin();

  const { data: fees } = await db
    .from("performance_fees")
    .select("amount, status")
    .eq("property_id", propertyId)
    .eq("billing_month", billingMonth);

  const leaseCount = fees?.length ?? 0;
  const totalCents = fees?.reduce((sum, f) => sum + f.amount, 0) ?? 0;
  const pendingCents = fees?.filter(f => f.status === "pending").reduce((sum, f) => sum + f.amount, 0) ?? 0;

  return { billingMonth, propertyId, leaseCount, totalCents, pendingCents };
}

// ─── getOperatorMonthlySummary ────────────────────────────────────────────────

export async function getOperatorMonthlySummary(
  operatorId: string,
  billingMonth: string
) {
  const db = getSupabaseAdmin();

  const [feesResult, subResult] = await Promise.all([
    db
      .from("performance_fees")
      .select("amount, status, property_id")
      .eq("operator_id", operatorId)
      .eq("billing_month", billingMonth),
    db
      .from("billing_subscriptions")
      .select("platform_fee, marketing_addon, marketing_fee")
      .eq("operator_id", operatorId)
      .single(),
  ]);

  const fees = feesResult.data ?? [];
  const sub = subResult.data;

  const performanceCount = fees.length;
  const performanceTotal = fees.reduce((sum, f) => sum + f.amount, 0);
  const platformFee = sub?.platform_fee ?? 100000;
  const marketingFee = sub?.marketing_addon ? (sub.marketing_fee ?? 200000) : 0;
  const totalDue = platformFee + marketingFee + performanceTotal;

  return {
    operatorId,
    billingMonth,
    platformFee,
    marketingFee,
    performanceCount,
    performanceTotal,
    totalDue,
  };
}

// ─── generateBillingPeriod ────────────────────────────────────────────────────
// Creates or refreshes a billing_period row for the given operator + month.

export async function generateBillingPeriod(
  operatorId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<BillingPeriod> {
  const db = getSupabaseAdmin();
  const billingMonth = periodStart.toISOString().slice(0, 7);
  const summary = await getOperatorMonthlySummary(operatorId, billingMonth);

  const row = {
    operator_id:             operatorId,
    period_start:            periodStart.toISOString().split("T")[0],
    period_end:              periodEnd.toISOString().split("T")[0],
    platform_fee:            summary.platformFee,
    marketing_addon_fee:     summary.marketingFee,
    performance_lease_count: summary.performanceCount,
    performance_fee_total:   summary.performanceTotal,
    total_due:               summary.totalDue,
    status:                  "draft" as const,
  };

  const { data, error } = await db
    .from("billing_periods")
    .upsert(row, { onConflict: "operator_id,period_start" })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to generate billing period: ${error?.message}`);
  return data as BillingPeriod;
}

// ─── getPerformanceFeesByProperty ─────────────────────────────────────────────

export async function getPerformanceFeesByProperty(
  operatorId: string,
  billingMonth?: string
): Promise<Array<{ property_id: string; count: number; total_cents: number }>> {
  const db = getSupabaseAdmin();

  let query = db
    .from("performance_fees")
    .select("property_id, amount")
    .eq("operator_id", operatorId);

  if (billingMonth) query = query.eq("billing_month", billingMonth);

  const { data } = await query;
  if (!data) return [];

  const map = new Map<string, { count: number; total_cents: number }>();
  for (const fee of data) {
    const existing = map.get(fee.property_id) ?? { count: 0, total_cents: 0 };
    map.set(fee.property_id, { count: existing.count + 1, total_cents: existing.total_cents + fee.amount });
  }

  return Array.from(map.entries()).map(([property_id, v]) => ({ property_id, ...v }));
}
