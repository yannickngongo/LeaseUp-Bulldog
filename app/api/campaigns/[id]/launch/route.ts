// POST /api/campaigns/[id]/launch
//
// New billing model:
//   - Operator must have an active Marketing Add-on subscription ($500/mo)
//   - No per-launch Stripe charge — Meta / Google bills the operator's own ad
//     account directly for actual ad spend
//   - 5% fee is computed daily by /api/cron/sync-ad-spend and reported to Stripe
//     as metered usage on the same subscription
//
// Flow:
//   1. Verify subscription is active (or operator is in PRO_OVERRIDE_EMAILS)
//   2. Verify Meta / Google credentials are connected
//   3. Create campaign on the ad platform
//   4. Persist external IDs + status=active
//   5. Cron will start tracking spend tomorrow

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";
import { createMetaLeadCampaign } from "@/lib/meta-ads";
import { hasActiveMarketingSubscription } from "@/lib/stripe-server";
import { isMarketingAddonLive } from "@/lib/feature-flags";

const Schema = z.object({
  platform:     z.enum(["facebook", "instagram", "google"]),
  budgetCents:  z.number().int().min(100),
  durationDays: z.number().int().min(1).max(365),
  imageUrl:     z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  // Hard gate: Marketing Add-on launch flag
  if (!isMarketingAddonLive()) {
    return NextResponse.json({
      error:        "Marketing Add-on is launching soon — join the waitlist at /marketing",
      coming_soon:  true,
      waitlist_url: "/marketing",
    }, { status: 503 });
  }

  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { platform, budgetCents, durationDays, imageUrl } = parsed.data;

  const db = getSupabaseAdmin();

  // ── 1. Subscription gate ──────────────────────────────────────────────────────
  const [opRes, subRes] = await Promise.all([
    db.from("operators")
      .select(`email, meta_access_token, meta_ad_account_id, meta_page_id`)
      .eq("id", ctx.operatorId)
      .single(),
    db.from("billing_subscriptions")
      .select("marketing_addon")
      .eq("operator_id", ctx.operatorId)
      .maybeSingle(),
  ]);
  const operator = opRes.data;

  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  if (!hasActiveMarketingSubscription({
    email:           operator.email,
    marketing_addon: subRes.data?.marketing_addon,
  })) {
    return NextResponse.json({
      error:           "Marketing Add-on subscription required",
      subscribe_url:   "/settings/billing",
      subscribe_terms: "$500/mo + 5% of actual ad spend",
    }, { status: 402 });
  }

  // ── 2. Verify campaign ownership ──────────────────────────────────────────────
  const { data: campaign } = await db
    .from("campaigns")
    .select(`
      id, status, image_url,
      properties!inner(name, city, state, operator_id),
      ad_variations(headline, primary_text, cta, channel, approved)
    `)
    .eq("id", campaignId)
    .single();

  const prop = campaign?.properties as unknown as { name: string; city: string; state: string; operator_id: string } | null;
  if (!campaign || prop?.operator_id !== ctx.operatorId) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // ── 3. Determine final image URL ──────────────────────────────────────────────
  const finalImageUrl = imageUrl ?? (campaign.image_url as string | null) ?? null;

  // ── 4. Create campaign on ad platform ─────────────────────────────────────────
  let metaCampaignId: string | null = null;
  let metaAdSetId:    string | null = null;
  let metaAdId:       string | null = null;
  let metaLeadFormId: string | null = null;
  let launchWarning:  string | null = null;

  const isMeta = platform === "facebook" || platform === "instagram";

  if (isMeta) {
    if (!operator.meta_access_token || !operator.meta_ad_account_id || !operator.meta_page_id) {
      return NextResponse.json({
        error:        "Meta Ads not connected",
        connect_url:  "/integrations",
      }, { status: 412 });
    }

    if (!finalImageUrl) {
      launchWarning = "No property image — ad created with placeholder. Add one in the campaign detail.";
    }

    // Pick the best approved variation for this platform (or first variation)
    const variations = (campaign.ad_variations as { headline: string; primary_text: string; cta: string; channel: string; approved: boolean }[]) ?? [];
    const variation  = variations.find(v => v.approved && (v.channel === platform || v.channel === "facebook"))
                    ?? variations.find(v => v.channel === platform || v.channel === "facebook")
                    ?? variations[0];

    try {
      const result = await createMetaLeadCampaign({
        creds: {
          accessToken:  operator.meta_access_token,
          adAccountId:  operator.meta_ad_account_id,
          pageId:       operator.meta_page_id,
        },
        propertyName:     prop?.name ?? "Property",
        city:             prop?.city ?? "",
        state:            prop?.state ?? "",
        headline:         variation?.headline    ?? prop?.name ?? "Find Your New Home",
        primaryText:      variation?.primary_text ?? "Discover your perfect apartment. Contact us today!",
        cta:              variation?.cta          ?? "Schedule a Tour",
        imageUrl:         finalImageUrl ?? "https://placehold.co/1200x628/C8102E/FFFFFF?text=New+Home",
        totalBudgetCents: budgetCents,
        durationDays,
        privacyPolicyUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://lease-up-bulldog.vercel.app"}/privacy`,
      });

      metaCampaignId = result.campaignId;
      metaAdSetId    = result.adSetId;
      metaAdId       = result.adId;
      metaLeadFormId = result.leadFormId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({
        error:   `Failed to create campaign on Meta: ${msg}`,
        hint:    "Check that your Meta Page has a credit card on file and that your access token has ads_management + leads_retrieval permissions.",
      }, { status: 502 });
    }
  } else if (platform === "google") {
    launchWarning = "Google Ads programmatic creation requires a developer token. For now, configure your campaign in Google Ads Manager — set the Lead Form webhook URL from Integrations → Google Ads.";
  }

  // ── 5. Persist launch details ─────────────────────────────────────────────────
  const now = new Date().toISOString();
  await db.from("campaigns").update({
    status:           "active",
    ad_platform:      platform,
    ad_budget_cents:  budgetCents,
    ad_duration_days: durationDays,
    image_url:        finalImageUrl,
    launched_at:      now,
    ...(metaCampaignId ? {
      meta_campaign_id:  metaCampaignId,
      meta_adset_id:     metaAdSetId,
      meta_ad_id:        metaAdId,
      meta_lead_form_id: metaLeadFormId,
    } : {}),
  }).eq("id", campaignId);

  // ── 6. Activity log ───────────────────────────────────────────────────────────
  await db.from("activity_logs").insert({
    lead_id:     "00000000-0000-0000-0000-000000000000",
    property_id: "00000000-0000-0000-0000-000000000000",
    action:      "campaign_launched",
    actor:       "agent",
    metadata:    {
      campaign_id:      campaignId,
      platform,
      budget_cents:     budgetCents,
      duration_days:    durationDays,
      meta_campaign_id: metaCampaignId,
      operator:         ctx.email,
      warning:          launchWarning,
    },
  });

  return NextResponse.json({
    ok:      true,
    status:  "active",
    warning: launchWarning,
    meta:    metaCampaignId ? { campaignId: metaCampaignId, adSetId: metaAdSetId, adId: metaAdId } : null,
  });
}
