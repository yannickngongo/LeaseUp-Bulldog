// GET /api/billing/admin-summary
// Returns all active operators with last-month billing breakdown.
// Admin-only — requires X-Admin-Email header matching ADMIN_EMAIL env var.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || ctx.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getSupabaseAdmin();

  // Last month string 'YYYY-MM'
  const now   = new Date();
  const prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const billingMonth = prev.toISOString().slice(0, 7);

  // All active operators
  const { data: operators, error } = await db
    .from("operators")
    .select("id, name, email, stripe_customer_id, subscription_status, meta_ad_account_id, google_ads_customer_id")
    .in("subscription_status", ["active", "trialing"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const operatorIds = (operators ?? []).map(o => o.id);

  // Billing subscriptions
  const { data: subs } = await db
    .from("billing_subscriptions")
    .select("operator_id, marketing_addon, marketing_fee, performance_fee_per_lease, status")
    .in("operator_id", operatorIds);

  // Pending performance fees for last month
  const { data: fees } = await db
    .from("performance_fees")
    .select("operator_id, amount, status")
    .in("operator_id", operatorIds)
    .eq("billing_month", billingMonth);

  // Already-run billing periods for last month
  const { data: periods } = await db
    .from("billing_periods")
    .select("operator_id, total_due, status, stripe_invoice_id, stripe_invoice_url")
    .in("operator_id", operatorIds)
    .eq("period_start", `${billingMonth}-01`);

  const subMap    = Object.fromEntries((subs    ?? []).map(s => [s.operator_id, s]));
  const periodMap = Object.fromEntries((periods ?? []).map(p => [p.operator_id, p]));

  const feesByOp: Record<string, { count: number; total: number }> = {};
  for (const f of fees ?? []) {
    const existing = feesByOp[f.operator_id] ?? { count: 0, total: 0 };
    feesByOp[f.operator_id] = {
      count: existing.count + 1,
      total: existing.total + f.amount,
    };
  }

  const summary = (operators ?? []).map(op => ({
    operator:          op,
    subscription:      subMap[op.id]    ?? null,
    period:            periodMap[op.id] ?? null,
    billing_month:     billingMonth,
    lease_count:       feesByOp[op.id]?.count ?? 0,
    performance_total: feesByOp[op.id]?.total ?? 0,
  }));

  return NextResponse.json({ summary, billing_month: billingMonth });
}
