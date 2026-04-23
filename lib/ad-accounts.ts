// Automated ad account provisioning for operators on the Core + Marketing plan.
// When an operator checks out, this creates a dedicated sub-account for them
// under LUB's Meta Business Manager and Google Ads MCC.
//
// Required env vars:
//   Meta:   META_ACCESS_TOKEN, META_BUSINESS_ID
//   Google: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID,
//           GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_MANAGER_ID

import { getSupabaseAdmin } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProvisionResult {
  operator_id:             string;
  meta_ad_account_id:      string | null;
  google_ads_customer_id:  string | null;
  errors:                  string[];
}

// ── Meta ──────────────────────────────────────────────────────────────────────
// Creates a new ad account under LUB's Business Manager.
// Docs: https://developers.facebook.com/docs/marketing-api/reference/business/adaccounts/

export async function createMetaAdAccount(operatorName: string): Promise<string> {
  const token      = process.env.META_ACCESS_TOKEN;
  const businessId = process.env.META_BUSINESS_ID;

  if (!token || !businessId) {
    throw new Error("META_ACCESS_TOKEN or META_BUSINESS_ID not set");
  }

  const params = new URLSearchParams({
    name:           `LUB — ${operatorName}`,
    currency:       "USD",
    timezone_id:    "1",           // America/Los_Angeles (UTC-8); change if needed
    end_advertiser: businessId,    // the entity paying for ads
    media_agency:   businessId,    // LUB is the agency
    partner:        "NONE",
    access_token:   token,
  });

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${businessId}/adaccounts`,
    { method: "POST", body: params }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta ad account creation failed (${res.status}): ${body}`);
  }

  const json = await res.json() as { id?: string; account_id?: string };
  // Meta returns either "act_XXXXXXX" or "XXXXXXX" — normalize to "act_XXXXXXX"
  const raw = json.id ?? json.account_id ?? "";
  return raw.startsWith("act_") ? raw : `act_${raw}`;
}

// ── Google Ads ────────────────────────────────────────────────────────────────
// Creates a new client account under LUB's Manager (MCC) account.
// Docs: https://developers.google.com/google-ads/api/reference/rpc/v17/CustomerService

async function getGoogleAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_ADS_CLIENT_ID     ?? "",
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "",
      grant_type:    "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google OAuth failed (${res.status}): ${body}`);
  }

  const json = await res.json() as { access_token: string };
  return json.access_token;
}

export async function createGoogleAdsAccount(operatorName: string): Promise<string> {
  const devToken  = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const managerId = process.env.GOOGLE_ADS_MANAGER_ID?.replace(/-/g, "");

  if (!devToken || !managerId || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    throw new Error("Google Ads env vars not fully configured");
  }

  const accessToken = await getGoogleAccessToken();

  // Create client account linked to LUB's MCC
  const res = await fetch(
    `https://googleads.googleapis.com/v17/customers/${managerId}:createCustomerClient`,
    {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "Authorization":   `Bearer ${accessToken}`,
        "developer-token": devToken,
        "login-customer-id": managerId,
      },
      body: JSON.stringify({
        customerClient: {
          descriptiveName: `LUB — ${operatorName}`,
          currencyCode:    "USD",
          timeZone:        "America/Chicago", // adjust to your market
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Ads account creation failed (${res.status}): ${body}`);
  }

  const json = await res.json() as { resourceName?: string };
  // resourceName = "customers/XXXXXXXXXX" — extract the numeric ID
  const customerId = json.resourceName?.split("/")[1] ?? "";
  if (!customerId) throw new Error("Google Ads returned no customer ID");

  // Format as XXX-XXX-XXXX for readability
  return customerId.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
}

// ── provisionAdAccounts ───────────────────────────────────────────────────────
// Top-level function called from the Stripe webhook.
// Creates both accounts (in parallel), stores IDs in Supabase, returns result.

export async function provisionAdAccounts(
  operatorId:   string,
  operatorName: string
): Promise<ProvisionResult> {
  const db     = getSupabaseAdmin();
  const errors: string[] = [];

  const [metaResult, googleResult] = await Promise.allSettled([
    createMetaAdAccount(operatorName),
    createGoogleAdsAccount(operatorName),
  ]);

  const metaId   = metaResult.status   === "fulfilled" ? metaResult.value   : null;
  const googleId = googleResult.status === "fulfilled" ? googleResult.value : null;

  if (metaResult.status   === "rejected") errors.push(`Meta: ${metaResult.reason}`);
  if (googleResult.status === "rejected") errors.push(`Google: ${googleResult.reason}`);

  // Persist whatever we got — partial success is better than nothing
  if (metaId || googleId) {
    await db
      .from("operators")
      .update({
        ...(metaId   ? { meta_ad_account_id:     metaId   } : {}),
        ...(googleId ? { google_ads_customer_id:  googleId } : {}),
      })
      .eq("id", operatorId);
  }

  if (errors.length > 0) {
    console.error(`[ad-accounts] provisioning errors for operator=${operatorId}:`, errors);
  }

  return { operator_id: operatorId, meta_ad_account_id: metaId, google_ads_customer_id: googleId, errors };
}
