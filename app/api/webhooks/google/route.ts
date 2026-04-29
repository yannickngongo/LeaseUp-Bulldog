// Google Lead Form Webhook endpoint
//
// Google Ads sends leads here when someone submits a Lead Form Extension.
//
// Required env var:
//   GOOGLE_WEBHOOK_KEY   — the "Key" you generate in Google Ads → Assets → Lead forms
//
// Setup in Google Ads Manager:
//   In your Lead Form Asset: Webhook URL → https://your-domain.com/api/webhooks/google
//   Key: value of GOOGLE_WEBHOOK_KEY env var
//
// Google will send a test POST during setup — this endpoint handles it correctly.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ingestCampaignLead } from "@/lib/marketing";

interface GoogleLeadPayload {
  google_key:       string;
  lead_id:          string;
  campaign_id:      string;
  campaign_name:    string;
  adgroup_id:       string;
  adgroup_name:     string;
  ad_id:            string;
  form_id:          string;
  form_name:        string;
  gcl_id:           string;
  api_version:      string;
  is_test:          boolean;
  user_column_data: { column_id: string; string_value: string }[];
}

function extractField(data: GoogleLeadPayload["user_column_data"], columnId: string): string {
  return data.find(d => d.column_id === columnId)?.string_value ?? "";
}

export async function POST(req: NextRequest) {
  let payload: GoogleLeadPayload;
  try {
    payload = await req.json() as GoogleLeadPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify Google webhook key
  const expectedKey = process.env.GOOGLE_WEBHOOK_KEY;
  if (expectedKey && payload.google_key !== expectedKey) {
    return NextResponse.json({ error: "Invalid webhook key" }, { status: 401 });
  }

  // Test leads (sent during setup) — acknowledge but don't persist
  if (payload.is_test) {
    return NextResponse.json({ ok: true, test: true });
  }

  const fields = payload.user_column_data ?? [];
  const firstName = extractField(fields, "GIVEN_NAME");
  const lastName  = extractField(fields, "FAMILY_NAME");
  const fullName  = [firstName, lastName].filter(Boolean).join(" ") || extractField(fields, "FULL_NAME") || "Unknown";
  const phone     = extractField(fields, "PHONE_NUMBER");
  const email     = extractField(fields, "EMAIL");

  if (!phone && !email) {
    return NextResponse.json({ ok: true, skipped: "no contact info" });
  }

  const db = getSupabaseAdmin();

  // Find campaign by Google campaign ID (set when operator connects Google Ads)
  const { data: campaign } = await db
    .from("campaigns")
    .select("id, property_id")
    .eq("google_campaign_id", payload.campaign_id)
    .single();

  if (!campaign) {
    // Campaign not found — still create lead if we can match by campaign name convention
    // LUB campaign names follow "LUB — {property_name} — {date}" pattern
    console.warn(`Google webhook: no campaign found for google_campaign_id=${payload.campaign_id}`);
    return NextResponse.json({ ok: true, warning: "Campaign not found in LUB" });
  }

  try {
    await ingestCampaignLead({
      property_id:  campaign.property_id,
      campaign_id:  campaign.id,
      name:         fullName,
      phone:        phone || email,
      email:        email || undefined,
      utm_source:   "google",
      utm_medium:   "lead_form",
      utm_campaign: payload.campaign_name,
    });
  } catch (err) {
    console.error("Google webhook: failed to ingest lead:", err);
    return NextResponse.json({ error: "Lead ingestion failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
