// POST /api/billing/run-monthly
//
// Automated monthly billing engine. Called by Vercel cron on the 1st of each
// month, or manually triggered from the admin billing page.
//
// For each active operator with a marketing add-on:
//   1. Pulls last-month ad spend from Meta + Google Ads APIs
//   2. Fetches all pending performance fees from the DB
//   3. Creates a Stripe Invoice with all variable line items
//   4. Finalizes + auto-charges the invoice
//   5. Marks performance fees as 'invoiced' and upserts the billing_period row
//
// Body (optional — omit to run all operators):
//   { operator_id?: string }
//
// Auth: CRON_SECRET header (set by Vercel cron) or admin session cookie.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { fetchTotalAdSpend, lastMonthRange } from "@/lib/ad-spend";
import Stripe from "stripe";

// ── Auth ──────────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const cronSecret  = process.env.CRON_SECRET;
  const adminEmail  = process.env.ADMIN_EMAIL;

  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization") ?? "";
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // Manual trigger from admin page sends X-Admin-Email header
  const callerEmail = req.headers.get("x-admin-email") ?? "";
  if (adminEmail && callerEmail === adminEmail) return true;

  return false;
}

// ── Core billing logic for a single operator ──────────────────────────────────

interface BillingResult {
  operator_id:        string;
  operator_name:      string;
  invoice_id:         string;
  invoice_url:        string | null;
  total_cents:        number;
  performance_leases: number;
  ad_spend_cents:     number;
  skipped?:           string; // reason if no invoice was created
}

async function runBillingForOperator(
  operatorId: string
): Promise<BillingResult> {
  const db    = getSupabaseAdmin();
  const range = lastMonthRange();
  const billingMonth = range.since.slice(0, 7); // 'YYYY-MM'

  // 1. Load operator + billing subscription
  const { data: operator } = await db
    .from("operators")
    .select("id, name, email, stripe_customer_id, meta_ad_account_id, google_ads_customer_id")
    .eq("id", operatorId)
    .single();

  if (!operator) throw new Error(`Operator ${operatorId} not found`);

  const { data: sub } = await db
    .from("billing_subscriptions")
    .select("marketing_addon, marketing_fee, performance_fee_per_lease, status")
    .eq("operator_id", operatorId)
    .single();

  if (!operator.stripe_customer_id) {
    return {
      operator_id:   operatorId,
      operator_name: operator.name,
      invoice_id:    "",
      invoice_url:   null,
      total_cents:   0,
      performance_leases: 0,
      ad_spend_cents: 0,
      skipped: "No Stripe customer — operator has not completed checkout",
    };
  }

  // 2. Get pending performance fees for last month
  const { data: fees } = await db
    .from("performance_fees")
    .select("id, amount")
    .eq("operator_id", operatorId)
    .eq("billing_month", billingMonth)
    .eq("status", "pending");

  const feeRows         = fees ?? [];
  const performanceCount = feeRows.length;
  const performanceTotal = feeRows.reduce((s, f) => s + f.amount, 0);

  // 3. Pull ad spend from Meta + Google if marketing addon is active
  let adSpendCents     = 0;
  let adSpendFeeCents  = 0;
  let marketingBaseFee = 0;

  if (sub?.marketing_addon) {
    const spend = await fetchTotalAdSpend(
      operator.meta_ad_account_id    ?? null,
      operator.google_ads_customer_id ?? null,
      range
    );
    adSpendCents    = spend.total_cents;
    adSpendFeeCents = Math.round(adSpendCents * 0.05);
    marketingBaseFee = sub.marketing_fee ?? 50000; // $500
  }

  // 4. Skip if nothing to bill
  const totalDue = performanceTotal + marketingBaseFee + adSpendFeeCents;
  if (totalDue === 0) {
    return {
      operator_id:   operatorId,
      operator_name: operator.name,
      invoice_id:    "",
      invoice_url:   null,
      total_cents:   0,
      performance_leases: performanceCount,
      ad_spend_cents: adSpendCents,
      skipped: "Nothing to bill this month",
    };
  }

  // 5. Build Stripe Invoice with line items
  const invoice = await stripe.invoices.create({
    customer:           operator.stripe_customer_id,
    collection_method:  "charge_automatically",
    auto_advance:       false, // we finalize manually
    description:        `LeaseUp Bulldog — ${billingMonth} Variable Fees`,
    metadata: {
      operator_id:    operatorId,
      billing_month:  billingMonth,
    },
  });

  const invoiceItemParams: Stripe.InvoiceItemCreateParams = {
    customer: operator.stripe_customer_id,
    invoice:  invoice.id,
    currency: "usd",
  };

  const lineItems: Promise<unknown>[] = [];

  if (performanceTotal > 0) {
    lineItems.push(
      stripe.invoiceItems.create({
        ...invoiceItemParams,
        amount:      performanceTotal,
        description: `Performance fee — ${performanceCount} lease${performanceCount !== 1 ? "s" : ""} signed through LUB ($200 each)`,
      })
    );
  }

  if (marketingBaseFee > 0) {
    lineItems.push(
      stripe.invoiceItems.create({
        ...invoiceItemParams,
        amount:      marketingBaseFee,
        description: "Marketing add-on base fee — $500/mo",
      })
    );
  }

  if (adSpendFeeCents > 0) {
    const spendDollars = (adSpendCents / 100).toFixed(2);
    lineItems.push(
      stripe.invoiceItems.create({
        ...invoiceItemParams,
        amount:      adSpendFeeCents,
        description: `Ad spend fee — 5% of $${spendDollars} total spend (Meta + Google)`,
      })
    );
  }

  await Promise.all(lineItems);

  // 6. Finalize + pay
  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  const paid      = await stripe.invoices.pay(finalized.id);

  // 7. Mark performance fees as invoiced
  if (feeRows.length > 0) {
    await db
      .from("performance_fees")
      .update({ status: "invoiced" })
      .in("id", feeRows.map(f => f.id));
  }

  // 8. Upsert billing_period record
  const periodStart = new Date(range.since);
  const periodEnd   = new Date(range.until);

  await db.from("billing_periods").upsert(
    {
      operator_id:             operatorId,
      period_start:            periodStart.toISOString().split("T")[0],
      period_end:              periodEnd.toISOString().split("T")[0],
      marketing_addon_fee:     marketingBaseFee,
      ad_spend_cents:          adSpendCents,
      ad_spend_fee_cents:      adSpendFeeCents,
      performance_lease_count: performanceCount,
      performance_fee_total:   performanceTotal,
      total_due:               totalDue,
      status:                  "paid",
      stripe_invoice_id:       paid.id,
      stripe_invoice_url:      paid.hosted_invoice_url ?? null,
    },
    { onConflict: "operator_id,period_start" }
  );

  return {
    operator_id:        operatorId,
    operator_name:      operator.name,
    invoice_id:         paid.id,
    invoice_url:        paid.hosted_invoice_url ?? null,
    total_cents:        totalDue,
    performance_leases: performanceCount,
    ad_spend_cents:     adSpendCents,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { operator_id?: string };
  const db   = getSupabaseAdmin();

  // Resolve operator list — single or all active
  let operatorIds: string[];

  if (body.operator_id) {
    operatorIds = [body.operator_id];
  } else {
    const { data: ops } = await db
      .from("operators")
      .select("id")
      .in("subscription_status", ["active", "trialing"]);
    operatorIds = (ops ?? []).map(o => o.id);
  }

  if (operatorIds.length === 0) {
    return NextResponse.json({ message: "No active operators to bill", results: [] });
  }

  const results: BillingResult[] = [];
  const errors:  Array<{ operator_id: string; error: string }> = [];

  for (const id of operatorIds) {
    try {
      results.push(await runBillingForOperator(id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[billing/run-monthly] operator=${id}`, message);
      errors.push({ operator_id: id, error: message });
    }
  }

  const status = errors.length > 0 && results.length === 0 ? 500 : 200;
  return NextResponse.json({ results, errors }, { status });
}
