// Pulls last-month ad spend from Meta (Facebook/Instagram) and Google Ads.
// Returns total spend in cents for a given operator over a date range.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdSpendResult {
  meta_cents:   number;
  google_cents: number;
  total_cents:  number;
}

export interface DateRange {
  since: string; // 'YYYY-MM-DD'
  until: string; // 'YYYY-MM-DD'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dollarsToCents(dollars: string | number): number {
  return Math.round(parseFloat(String(dollars)) * 100);
}

export function lastMonthRange(): DateRange {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end   = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
  return {
    since: start.toISOString().slice(0, 10),
    until: end.toISOString().slice(0, 10),
  };
}

// ── Meta Marketing API ────────────────────────────────────────────────────────
// Docs: https://developers.facebook.com/docs/marketing-api/reference/ad-account/insights/
//
// Required env vars:
//   META_ACCESS_TOKEN   — long-lived system user token from Meta Business Suite
//
// Per-operator config (stored in operators table):
//   meta_ad_account_id  — e.g. "act_12345678"

export async function fetchMetaSpend(
  adAccountId: string,
  range: DateRange
): Promise<number> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    console.warn("[ad-spend] META_ACCESS_TOKEN not set — skipping Meta spend");
    return 0;
  }

  // Normalize: ensure "act_" prefix
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  const params = new URLSearchParams({
    fields:     "spend",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level:      "account",
    access_token: token,
  });

  const url = `https://graph.facebook.com/v21.0/${accountId}/insights?${params}`;
  const res  = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta API error ${res.status}: ${body}`);
  }

  const json = await res.json() as { data?: Array<{ spend?: string }> };
  const spend = json.data?.[0]?.spend ?? "0";
  return dollarsToCents(spend);
}

// ── Google Ads API ────────────────────────────────────────────────────────────
// Docs: https://developers.google.com/google-ads/api/docs/reporting/overview
//
// Required env vars:
//   GOOGLE_ADS_DEVELOPER_TOKEN  — from Google Ads API Center
//   GOOGLE_ADS_CLIENT_ID        — OAuth2 client ID
//   GOOGLE_ADS_CLIENT_SECRET    — OAuth2 client secret
//   GOOGLE_ADS_REFRESH_TOKEN    — offline refresh token for LUB's manager account
//   GOOGLE_ADS_MANAGER_ID       — LUB's manager (MCC) customer ID, digits only
//
// Per-operator config (stored in operators table):
//   google_ads_customer_id  — e.g. "123-456-7890" (hyphens optional)

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
    throw new Error(`Google OAuth error ${res.status}: ${body}`);
  }

  const json = await res.json() as { access_token: string };
  return json.access_token;
}

export async function fetchGoogleSpend(
  customerId: string,
  range: DateRange
): Promise<number> {
  const devToken  = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const managerId = process.env.GOOGLE_ADS_MANAGER_ID;

  if (!devToken || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    console.warn("[ad-spend] Google Ads env vars not set — skipping Google spend");
    return 0;
  }

  // Strip hyphens from customer ID
  const cid = customerId.replace(/-/g, "");

  const accessToken = await getGoogleAccessToken();

  // GAQL: sum cost_micros for the date range, convert to dollars
  const query = `
    SELECT metrics.cost_micros
    FROM customer
    WHERE segments.date BETWEEN '${range.since}' AND '${range.until}'
  `;

  const url = `https://googleads.googleapis.com/v17/customers/${cid}/googleAds:search`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":             "application/json",
      "Authorization":            `Bearer ${accessToken}`,
      "developer-token":          devToken,
      ...(managerId ? { "login-customer-id": managerId.replace(/-/g, "") } : {}),
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Ads API error ${res.status}: ${body}`);
  }

  const json = await res.json() as { results?: Array<{ metrics?: { costMicros?: string } }> };
  const totalMicros = (json.results ?? []).reduce((sum, row) => {
    return sum + parseInt(row.metrics?.costMicros ?? "0", 10);
  }, 0);

  // micros → dollars → cents
  return Math.round(totalMicros / 10000);
}

// ── fetchTotalAdSpend ─────────────────────────────────────────────────────────
// Pulls from both platforms and returns combined spend in cents.

export async function fetchTotalAdSpend(
  metaAdAccountId:     string | null,
  googleAdsCustomerId: string | null,
  range:               DateRange
): Promise<AdSpendResult> {
  const [meta_cents, google_cents] = await Promise.all([
    metaAdAccountId     ? fetchMetaSpend(metaAdAccountId, range)         : Promise.resolve(0),
    googleAdsCustomerId ? fetchGoogleSpend(googleAdsCustomerId, range)   : Promise.resolve(0),
  ]);

  return {
    meta_cents,
    google_cents,
    total_cents: meta_cents + google_cents,
  };
}
