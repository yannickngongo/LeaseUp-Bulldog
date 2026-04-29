// POST /api/campaigns/[id]/launch
// Called after Stripe payment is confirmed on the client.
// 1. Verifies the Stripe PaymentIntent succeeded.
// 2. Uploads campaign image to Supabase Storage (if base64 supplied).
// 3. Creates a Lead Generation campaign on Meta or Google Ads.
// 4. Updates campaign status to "active" with all external IDs.
// 5. Logs the launch to activity_logs.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";
import { createMetaLeadCampaign } from "@/lib/meta-ads";

const Schema = z.object({
  platform:         z.enum(["facebook", "instagram", "google"]),
  budgetCents:      z.number().int().min(100),
  durationDays:     z.number().int().min(1).max(365),
  imageUrl:         z.string().optional(),  // already-uploaded Supabase Storage URL
  paymentIntentId:  z.string().min(1),
});

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { platform, budgetCents, durationDays, imageUrl, paymentIntentId } = parsed.data;

  const db = getSupabaseAdmin();

  // ── 1. Verify campaign ownership ─────────────────────────────────────────────
  const { data: campaign } = await db
    .from("campaigns")
    .select(`
      id, status, image_url, operator_id,
      properties!inner(name, city, state, operator_id),
      ad_variations(headline, primary_text, cta, channel, approved)
    `)
    .eq("id", campaignId)
    .single();

  const prop = campaign?.properties as unknown as { name: string; city: string; state: string; operator_id: string } | null;
  if (!campaign || prop?.operator_id !== ctx.operatorId) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // ── 2. Verify Stripe payment ──────────────────────────────────────────────────
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json(
      { error: `Payment not complete — status: ${paymentIntent.status}` },
      { status: 402 }
    );
  }
  // Guard against replaying the same payment intent on another campaign
  if (paymentIntent.metadata?.campaign_id !== campaignId) {
    return NextResponse.json({ error: "Payment intent mismatch" }, { status: 409 });
  }

  // ── 3. Determine final image URL ──────────────────────────────────────────────
  const finalImageUrl = imageUrl ?? (campaign.image_url as string | null) ?? null;

  // ── 4. Load operator's ad platform credentials ────────────────────────────────
  const { data: operator } = await db
    .from("operators")
    .select("meta_access_token, meta_ad_account_id, meta_page_id, email")
    .eq("id", ctx.operatorId)
    .single();

  let metaCampaignId: string | null = null;
  let metaAdSetId:    string | null = null;
  let metaAdId:       string | null = null;
  let metaLeadFormId: string | null = null;
  let launchWarning:  string | null = null;

  // ── 5. Create campaign on ad platform ────────────────────────────────────────
  const isMeta = platform === "facebook" || platform === "instagram";

  if (isMeta) {
    if (operator?.meta_access_token && operator?.meta_ad_account_id && operator?.meta_page_id) {
      if (!finalImageUrl) {
        launchWarning = "No property image — ad created without image. Add one in the campaign detail.";
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
        // Payment succeeded but ad creation failed — record the error as a warning
        launchWarning = `Payment processed. Ad platform error: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else {
      launchWarning = "Payment received. Connect Meta Ads in Integrations → Meta Ads to publish your campaign.";
    }
  } else if (platform === "google") {
    // Google Ads requires developer token approval — record intent, show instructions
    launchWarning = "Payment received. Open Google Ads Manager and configure your campaign using the webhook URL in Integrations → Google Ads.";
  }

  // ── 6. Persist launch details ─────────────────────────────────────────────────
  const now = new Date().toISOString();
  await db.from("campaigns").update({
    status:                  "active",
    ad_platform:             platform,
    ad_budget_cents:         budgetCents,
    ad_duration_days:        durationDays,
    stripe_payment_intent_id: paymentIntentId,
    image_url:               finalImageUrl,
    launched_at:             now,
    ...(metaCampaignId ? {
      meta_campaign_id:   metaCampaignId,
      meta_adset_id:      metaAdSetId,
      meta_ad_id:         metaAdId,
      meta_lead_form_id:  metaLeadFormId,
    } : {}),
  }).eq("id", campaignId);

  // ── 7. Activity log ───────────────────────────────────────────────────────────
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
      payment_intent:   paymentIntentId,
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
