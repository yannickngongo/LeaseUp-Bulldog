// Meta Marketing API client for LeaseUp Bulldog.
// Creates Lead Generation campaigns on behalf of operators using their
// connected Facebook Page + Ad Account credentials.
//
// Required env vars (set by LUB, not per-operator):
//   META_APP_SECRET          — for webhook signature verification
//   META_VERIFY_TOKEN        — shared verify token for webhook subscription
//
// Per-operator credentials stored in operators table:
//   meta_access_token        — long-lived Page access token
//   meta_ad_account_id       — e.g. "act_123456789"
//   meta_page_id             — Facebook Page ID

const META_API_VERSION = "v20.0";
const BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetaCreds {
  accessToken:  string;
  adAccountId:  string; // "act_XXXXXXXXX"
  pageId:       string;
}

export interface CreateLeadCampaignInput {
  creds:            MetaCreds;
  propertyName:     string;
  city:             string;
  state:            string;
  headline:         string;  // max 40 chars
  primaryText:      string;  // max 125 chars
  cta:              string;
  imageUrl:         string;  // public URL (Supabase Storage CDN)
  totalBudgetCents: number;
  durationDays:     number;
  privacyPolicyUrl: string;
}

export interface MetaCampaignResult {
  campaignId:   string;
  adSetId:      string;
  adCreativeId: string;
  adId:         string;
  leadFormId:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function metaPost(
  path: string,
  accessToken: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  params.set("access_token", accessToken);
  for (const [k, v] of Object.entries(body)) {
    params.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  const res = await fetch(`${BASE}/${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    params.toString(),
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok || json.error) {
    const err = (json.error as Record<string, unknown> | undefined);
    throw new Error(`Meta API error on ${path}: ${err?.message ?? JSON.stringify(json)}`);
  }
  return json;
}

async function metaGet(
  path: string,
  accessToken: string,
  fields?: string
): Promise<Record<string, unknown>> {
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set("access_token", accessToken);
  if (fields) url.searchParams.set("fields", fields);
  const res  = await fetch(url.toString());
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok || json.error) {
    const err = (json.error as Record<string, unknown> | undefined);
    throw new Error(`Meta API error on GET ${path}: ${err?.message ?? JSON.stringify(json)}`);
  }
  return json;
}

// ─── City key lookup ──────────────────────────────────────────────────────────
// Returns the Meta geo location key for a city, needed for ad set targeting.

export async function getMetaCityKey(
  city: string,
  state: string,
  accessToken: string
): Promise<string | null> {
  const url = new URL(`${BASE}/search`);
  url.searchParams.set("type", "adgeolocation");
  url.searchParams.set("q", `${city}, ${state}`);
  url.searchParams.set("location_types", '["city"]');
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("limit", "3");

  const res  = await fetch(url.toString());
  const json = await res.json() as { data?: { key: string; name: string; country_code: string }[] };
  const match = (json.data ?? []).find(
    d => d.name.toLowerCase().includes(city.toLowerCase()) && d.country_code === "US"
  );
  return match?.key ?? null;
}

// ─── Lead form creation ───────────────────────────────────────────────────────

async function createLeadForm(
  pageId: string,
  accessToken: string,
  propertyName: string,
  privacyPolicyUrl: string
): Promise<string> {
  const body = {
    name:     `LUB Lead Form — ${propertyName}`,
    questions: JSON.stringify([
      { type: "FULL_NAME" },
      { type: "PHONE"     },
      { type: "EMAIL"     },
    ]),
    privacy_policy: JSON.stringify({
      url:       privacyPolicyUrl,
      link_text: "Privacy Policy",
    }),
    thank_you_page: JSON.stringify({
      title: "Thanks for your interest!",
      body:  "Our team will be in touch within the hour.",
    }),
  };
  const result = await metaPost(`${pageId}/leadgen_forms`, accessToken, body);
  return result.id as string;
}

// ─── Image upload ─────────────────────────────────────────────────────────────
// Registers a public image URL with Meta's ad image library.

async function uploadAdImage(
  adAccountId: string,
  accessToken: string,
  imageUrl: string
): Promise<string> {
  const result = await metaPost(`${adAccountId}/adimages`, accessToken, { url: imageUrl });
  // Response: { images: { [filename]: { hash, url } } }
  const images = result.images as Record<string, { hash: string }> | undefined;
  if (!images) throw new Error("Meta image upload returned no images");
  const firstKey = Object.keys(images)[0];
  return images[firstKey].hash;
}

// ─── createMetaLeadCampaign ───────────────────────────────────────────────────
// Full end-to-end campaign creation on Meta for a Lead Generation objective.

export async function createMetaLeadCampaign(
  input: CreateLeadCampaignInput
): Promise<MetaCampaignResult> {
  const { creds, propertyName, city, state, headline, primaryText, cta, imageUrl,
          totalBudgetCents, durationDays, privacyPolicyUrl } = input;
  const { accessToken, adAccountId, pageId } = creds;

  const now     = new Date();
  const endDate = new Date(now.getTime() + durationDays * 86_400_000);
  const startTime = now.toISOString().replace("T", " ").replace(/\.\d+Z$/, "+0000");
  const endTime   = endDate.toISOString().replace("T", " ").replace(/\.\d+Z$/, "+0000");

  // Daily budget = total / days, minimum $1/day (100 cents)
  const dailyBudgetCents = Math.max(100, Math.round(totalBudgetCents / durationDays));

  // 1. Lead form
  const leadFormId = await createLeadForm(pageId, accessToken, propertyName, privacyPolicyUrl);

  // 2. Upload image hash
  const imageHash = await uploadAdImage(adAccountId, accessToken, imageUrl);

  // 3. Campaign
  const campaignResult = await metaPost(`${adAccountId}/campaigns`, accessToken, {
    name:                 `LUB — ${propertyName} — ${now.toISOString().slice(0, 10)}`,
    objective:            "LEAD_GENERATION",
    status:               "ACTIVE",
    special_ad_categories: "[]",
  });
  const campaignId = campaignResult.id as string;

  // 4. Geo targeting — try city key, fall back to state-level
  const cityKey = await getMetaCityKey(city, state, accessToken);
  const targeting: Record<string, unknown> = {
    age_min: 18,
    age_max: 65,
  };
  if (cityKey) {
    targeting.geo_locations = {
      cities: [{ key: cityKey, radius: 15, distance_unit: "mile" }],
    };
  } else {
    targeting.geo_locations = {
      regions: [{ key: state }],
      countries: ["US"],
    };
  }

  // 5. Ad Set
  const adSetResult = await metaPost(`${adAccountId}/adsets`, accessToken, {
    name:              `LUB Adset — ${propertyName}`,
    campaign_id:       campaignId,
    optimization_goal: "LEAD_GENERATION",
    billing_event:     "IMPRESSIONS",
    daily_budget:      dailyBudgetCents,
    start_time:        startTime,
    end_time:          endTime,
    targeting:         targeting,
    leadgen_form_id:   leadFormId,
    status:            "ACTIVE",
  });
  const adSetId = adSetResult.id as string;

  // CTA type mapping
  const ctaTypeMap: Record<string, string> = {
    "Schedule a Tour": "LEARN_MORE",
    "Apply Now":       "APPLY_NOW",
    "Get Started":     "GET_STARTED",
    "Contact Us":      "CONTACT_US",
    "Sign Up":         "SIGN_UP",
  };
  const ctaType = ctaTypeMap[cta] ?? "LEARN_MORE";

  // 6. Ad Creative
  const adCreativeResult = await metaPost(`${adAccountId}/adcreatives`, accessToken, {
    name: `LUB Creative — ${propertyName}`,
    object_story_spec: {
      page_id:   pageId,
      link_data: {
        image_hash:    imageHash,
        message:       primaryText,
        name:          headline,
        call_to_action: {
          type:  ctaType,
          value: { lead_gen_form_id: leadFormId },
        },
      },
    },
  });
  const adCreativeId = adCreativeResult.id as string;

  // 7. Ad
  const adResult = await metaPost(`${adAccountId}/ads`, accessToken, {
    name:      `LUB Ad — ${propertyName}`,
    adset_id:  adSetId,
    creative:  { creative_id: adCreativeId },
    status:    "ACTIVE",
  });
  const adId = adResult.id as string;

  return { campaignId, adSetId, adCreativeId, adId, leadFormId };
}

// ─── pauseMetaCampaign / resumeMetaCampaign ───────────────────────────────────

export async function pauseMetaCampaign(
  adAccountId: string,
  campaignId: string,
  accessToken: string
): Promise<void> {
  await metaPost(`${campaignId}`, accessToken, { status: "PAUSED" });
}

export async function resumeMetaCampaign(
  adAccountId: string,
  campaignId: string,
  accessToken: string
): Promise<void> {
  await metaPost(`${campaignId}`, accessToken, { status: "ACTIVE" });
}

// ─── getMetaCampaignInsights ──────────────────────────────────────────────────
// Returns spend + impressions for a given campaign (last 30 days).

export async function getMetaCampaignInsights(
  campaignId: string,
  accessToken: string
): Promise<{ spend: number; impressions: number; clicks: number }> {
  const result = await metaGet(
    `${campaignId}/insights`,
    accessToken,
    "spend,impressions,clicks"
  );
  const data = (result.data as { spend: string; impressions: string; clicks: string }[] | undefined)?.[0];
  return {
    spend:       parseFloat(data?.spend       ?? "0"),
    impressions: parseInt(data?.impressions   ?? "0", 10),
    clicks:      parseInt(data?.clicks        ?? "0", 10),
  };
}

// ─── fetchMetaLead ────────────────────────────────────────────────────────────
// Fetches lead form submission data by lead ID (called from webhook handler).

export interface MetaLeadData {
  id:         string;
  name:       string;
  phone:      string;
  email:      string;
  adId:       string;
  formId:     string;
  campaignId: string;
}

export async function fetchMetaLead(
  leadId: string,
  accessToken: string
): Promise<MetaLeadData> {
  const result = await metaGet(
    leadId,
    accessToken,
    "id,created_time,field_data,ad_id,form_id,campaign_id"
  );

  const fields = (result.field_data as { name: string; values: string[] }[]) ?? [];
  const get = (key: string) =>
    fields.find(f => f.name.toLowerCase() === key)?.values?.[0] ?? "";

  const firstName = get("first_name");
  const lastName  = get("last_name");
  const fullName  = get("full_name") || `${firstName} ${lastName}`.trim() || "Unknown";

  return {
    id:         result.id as string,
    name:       fullName,
    phone:      get("phone_number"),
    email:      get("email"),
    adId:       result.ad_id as string ?? "",
    formId:     result.form_id as string ?? "",
    campaignId: result.campaign_id as string ?? "",
  };
}

// ─── verifyMetaWebhookSignature ───────────────────────────────────────────────
// Verifies X-Hub-Signature-256 header using META_APP_SECRET.

export function verifyMetaWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false;

  // signature is "sha256=HEXDIGEST"
  const [, digest] = signature.split("=");
  if (!digest) return false;

  // Use Web Crypto API (available in Next.js edge / Node 18+)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(appSecret);
  const msgData = encoder.encode(rawBody);

  // Synchronous-style check using createHmac (Node)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto") as typeof import("crypto");
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(digest,   "hex")
  );
}

// ─── verifyMetaToken ──────────────────────────────────────────────────────────
// Validates that a given access token has the required ad permissions.

export async function verifyMetaToken(
  accessToken: string,
  adAccountId: string,
  pageId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Check the token has access to the ad account
    await metaGet(`${adAccountId}`, accessToken, "id,name,account_status");
    // Check access to the page
    await metaGet(`${pageId}`, accessToken, "id,name");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Token verification failed" };
  }
}
