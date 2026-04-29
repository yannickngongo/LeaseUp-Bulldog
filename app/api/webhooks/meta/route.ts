// Meta Webhooks endpoint
//
// GET  — Webhook verification handshake (Meta calls this when you register the webhook)
// POST — Lead notification (Meta calls this when someone submits a Lead Ad form)
//
// Required env vars:
//   META_VERIFY_TOKEN   — the verify token you set in Meta App Dashboard → Webhooks
//   META_APP_SECRET     — your Facebook App Secret (for signature verification)
//
// Setup in Meta App Dashboard:
//   Webhook URL:    https://your-domain.com/api/webhooks/meta
//   Verify token:   value of META_VERIFY_TOKEN env var
//   Subscriptions:  leadgen

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchMetaLead, verifyMetaWebhookSignature } from "@/lib/meta-ads";
import { ingestCampaignLead } from "@/lib/marketing";

// ─── GET: webhook verification ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_VERIFY_TOKEN;
  if (!verifyToken) {
    return new NextResponse("META_VERIFY_TOKEN not configured", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ─── POST: lead notification ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify signature
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  if (signature && !verifyMetaWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    object: string;
    entry: {
      id: string;  // page_id
      changes: {
        field: string;
        value: {
          leadgen_id:  string;
          page_id:     string;
          form_id:     string;
          adgroup_id?: string;
          ad_id?:      string;
        };
      }[];
    }[];
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.object !== "page") {
    return NextResponse.json({ ok: true, skipped: "not a page event" });
  }

  const db = getSupabaseAdmin();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;

      const { leadgen_id, page_id, form_id, ad_id } = change.value;

      // Find the operator who owns this page
      const { data: operator } = await db
        .from("operators")
        .select("id, meta_access_token")
        .eq("meta_page_id", page_id)
        .single();

      if (!operator?.meta_access_token) {
        console.error(`Meta webhook: no operator found for page_id ${page_id}`);
        continue;
      }

      // Find the campaign via lead form ID or ad ID
      let campaignQuery = db
        .from("campaigns")
        .select("id, property_id")
        .eq("operator_id", operator.id);

      if (form_id) {
        campaignQuery = campaignQuery.eq("meta_lead_form_id", form_id);
      } else if (ad_id) {
        campaignQuery = campaignQuery.eq("meta_ad_id", ad_id);
      }

      const { data: campaign } = await campaignQuery.single();

      if (!campaign) {
        console.error(`Meta webhook: no campaign found for form_id=${form_id} ad_id=${ad_id}`);
        continue;
      }

      // Fetch lead details from Meta
      let leadData;
      try {
        leadData = await fetchMetaLead(leadgen_id, operator.meta_access_token);
      } catch (err) {
        console.error(`Meta webhook: failed to fetch lead ${leadgen_id}:`, err);
        continue;
      }

      if (!leadData.phone && !leadData.email) {
        console.warn(`Meta webhook: lead ${leadgen_id} has no phone or email — skipping`);
        continue;
      }

      // Ingest the lead into LUB and queue AI follow-up
      try {
        await ingestCampaignLead({
          property_id:  campaign.property_id,
          campaign_id:  campaign.id,
          name:         leadData.name  || "Unknown",
          phone:        leadData.phone || leadData.email,  // fallback email as phone contact
          email:        leadData.email || undefined,
          utm_source:   "facebook",
          utm_medium:   "lead_ad",
          utm_campaign: campaign.id,
        });
      } catch (err) {
        console.error(`Meta webhook: failed to ingest lead ${leadgen_id}:`, err);
      }
    }
  }

  // Always return 200 to Meta (retries otherwise)
  return NextResponse.json({ ok: true });
}
