// GET /api/cron/sync-ad-spend
// Daily cron: pulls actual ad spend from Meta for every active campaign,
// computes the delta since last sync, and reports it to Stripe metered billing
// as the operator's accumulated 5% fee.
//
// Auth: requires either ?secret={CRON_SECRET} or `Authorization: Bearer {CRON_SECRET}` header.
// Vercel Cron sends the Authorization header automatically when configured in vercel.json.
//
// Schedule (vercel.json):
//   { "crons": [{ "path": "/api/cron/sync-ad-spend", "schedule": "0 8 * * *" }] }   // 8am UTC daily

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMetaCampaignInsights } from "@/lib/meta-ads";
import { reportAdSpendUsage } from "@/lib/stripe-server";

interface SyncResult {
  campaignId:       string;
  operatorId:       string;
  totalSpendCents:  number;
  deltaCents:       number;
  reported:         boolean;
  error?:           string;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url   = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();

  // Fetch all active campaigns published on Meta, joined with operator subscription info
  const { data: campaigns } = await db
    .from("campaigns")
    .select(`
      id,
      operator_id,
      meta_campaign_id,
      total_spend_cents,
      last_synced_spend_cents,
      operators!inner(
        meta_access_token,
        stripe_subscription_item_metered_id,
        marketing_subscription_status
      )
    `)
    .eq("status", "active")
    .not("meta_campaign_id", "is", null);

  const results: SyncResult[] = [];

  for (const campaign of (campaigns ?? []) as unknown as {
    id:                       string;
    operator_id:              string;
    meta_campaign_id:         string;
    total_spend_cents:        number | null;
    last_synced_spend_cents:  number | null;
    operators: {
      meta_access_token:                   string | null;
      stripe_subscription_item_metered_id: string | null;
      marketing_subscription_status:       string | null;
    };
  }[]) {
    const op = campaign.operators;
    const result: SyncResult = {
      campaignId:      campaign.id,
      operatorId:      campaign.operator_id,
      totalSpendCents: campaign.total_spend_cents ?? 0,
      deltaCents:      0,
      reported:        false,
    };

    // Skip if no Meta token (operator disconnected)
    if (!op.meta_access_token) { result.error = "no meta token"; results.push(result); continue; }

    // Fetch current spend from Meta
    let totalSpendUsd = 0;
    try {
      const insights = await getMetaCampaignInsights(campaign.meta_campaign_id, op.meta_access_token);
      totalSpendUsd  = insights.spend;
    } catch (err) {
      result.error = `meta insights failed: ${err instanceof Error ? err.message : String(err)}`;
      results.push(result);
      continue;
    }

    const totalSpendCents = Math.round(totalSpendUsd * 100);
    const lastSpentCents  = campaign.last_synced_spend_cents ?? 0;
    const deltaCents      = totalSpendCents - lastSpentCents;
    result.totalSpendCents = totalSpendCents;
    result.deltaCents      = deltaCents;

    // No new spend → still update last_synced_at, no Stripe call
    if (deltaCents <= 0) {
      await db.from("campaigns").update({
        total_spend_cents: totalSpendCents,
        last_synced_at:    new Date().toISOString(),
      }).eq("id", campaign.id);
      results.push(result);
      continue;
    }

    // Report to Stripe metered billing
    let stripeUsageRecordId: string | null = null;
    if (op.stripe_subscription_item_metered_id && op.marketing_subscription_status === "active") {
      try {
        const dollarsDelta = deltaCents / 100;
        const usage = await reportAdSpendUsage(op.stripe_subscription_item_metered_id, dollarsDelta);
        stripeUsageRecordId = usage.id;
        result.reported = true;
      } catch (err) {
        result.error = `stripe report failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else {
      result.error = "no metered item or subscription inactive";
    }

    // 5% fee in cents (only persist if we successfully reported, to keep numbers consistent)
    const lubFeeDelta = result.reported ? Math.round(deltaCents * 0.05) : 0;

    // Persist new totals + sync log
    await db.from("campaigns").update({
      total_spend_cents:       totalSpendCents,
      last_synced_spend_cents: totalSpendCents,
      last_synced_at:          new Date().toISOString(),
      lub_fee_cents:           (campaign.total_spend_cents != null ? 0 : 0) + Math.round(totalSpendCents * 0.05),
    }).eq("id", campaign.id);

    await db.from("ad_spend_sync_log").insert({
      campaign_id:            campaign.id,
      operator_id:            campaign.operator_id,
      delta_cents:            deltaCents,
      total_spend_cents:      totalSpendCents,
      reported_to_stripe:     result.reported,
      stripe_usage_record_id: stripeUsageRecordId,
      error:                  result.error ?? null,
    });

    // suppress unused warning
    void lubFeeDelta;

    results.push(result);
  }

  return NextResponse.json({
    ok:           true,
    syncedCount:  results.length,
    reportedCount: results.filter(r => r.reported).length,
    results,
  });
}
