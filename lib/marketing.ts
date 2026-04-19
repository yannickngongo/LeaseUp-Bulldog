// AI Marketing Engine.
// Generates ad strategy and creative variations from property intake data.
// Ads are NOT launched automatically — they enter an approval queue.

import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { queueFollowUp } from "@/lib/follow-up";
import type { MarketingIntake, Campaign, AdVariation, AdChannel } from "@/lib/types";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  _client = new Anthropic({ apiKey });
  return _client;
}

// ─── Channel recommendation ───────────────────────────────────────────────────

interface StrategyOutput {
  recommended_channels: AdChannel[];
  messaging_angle: string;
}

async function generateStrategy(intake: MarketingIntake): Promise<StrategyOutput> {
  const client = getClient();
  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: 400,
    system: `You are a digital marketing strategist for apartment communities.
Given property intake data, recommend the best advertising channels and messaging angle.
Return ONLY valid JSON matching this shape:
{"recommended_channels": ["facebook"|"google"|"instagram"], "messaging_angle": "string"}
No markdown, no explanation.`,
    messages: [{
      role:    "user",
      content: `Property intake:
Target renter: ${intake.target_renter_type ?? "Not specified"}
Current special: ${intake.current_special ?? "None"}
Pricing: ${intake.pricing_summary ?? "Not provided"}
Occupancy goal: ${intake.occupancy_goal ?? "Not specified"}
Urgency: ${intake.urgency ?? "normal"}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(text) as StrategyOutput;
  } catch {
    return { recommended_channels: ["facebook", "google"], messaging_angle: "Highlight value and convenience." };
  }
}

// ─── Ad variation generation ──────────────────────────────────────────────────

interface RawAdVariation {
  headline: string;
  primary_text: string;
  cta: string;
  channel: AdChannel;
}

async function generateAdVariations(
  intake: MarketingIntake,
  strategy: StrategyOutput
): Promise<RawAdVariation[]> {
  const client = getClient();
  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: 1200,
    system: `You are a copywriter for apartment leasing ads.
Generate 4 ad variations for the given property. Return ONLY valid JSON: an array of objects.
Each object must have: headline (max 40 chars), primary_text (max 125 chars), cta (max 20 chars), channel.
Channels available: facebook, google, instagram.
No markdown, no explanation.`,
    messages: [{
      role:    "user",
      content: `Messaging angle: ${strategy.messaging_angle}
Target renter: ${intake.target_renter_type ?? "General"}
Current special: ${intake.current_special ?? "None"}
Pricing: ${intake.pricing_summary ?? "Not provided"}
Recommended channels: ${strategy.recommended_channels.join(", ")}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

// ─── createCampaign ───────────────────────────────────────────────────────────
// Generates strategy + variations, persists everything, returns campaign in draft state.

export async function createCampaign(intake: MarketingIntake): Promise<Campaign> {
  const db = getSupabaseAdmin();

  const [strategy, _] = await Promise.all([
    generateStrategy(intake),
    Promise.resolve(), // placeholder for future parallel work
  ]);

  const adVariations = await generateAdVariations(intake, strategy);

  const { data: campaign, error: campErr } = await db
    .from("campaigns")
    .insert({
      property_id:          intake.property_id,
      operator_id:          intake.operator_id,
      current_special:      intake.current_special ?? null,
      target_renter_type:   intake.target_renter_type ?? null,
      pricing_summary:      intake.pricing_summary ?? null,
      occupancy_goal:       intake.occupancy_goal ?? null,
      urgency:              intake.urgency ?? "normal",
      recommended_channels: strategy.recommended_channels,
      messaging_angle:      strategy.messaging_angle,
      status:               "pending_approval",
    })
    .select()
    .single();

  if (campErr || !campaign) throw new Error(`Failed to create campaign: ${campErr?.message}`);

  if (adVariations.length > 0) {
    const rows = adVariations.map((v, i) => ({
      campaign_id:   campaign.id,
      variation_num: i + 1,
      headline:      v.headline,
      primary_text:  v.primary_text,
      cta:           v.cta,
      channel:       v.channel,
      approved:      false,
    }));

    await db.from("ad_variations").insert(rows);
  }

  await db.from("activity_logs").insert({
    property_id: intake.property_id,
    action:      "campaign_created",
    actor:       "ai",
    metadata:    { campaign_id: campaign.id, variation_count: adVariations.length },
  });

  return campaign as Campaign;
}

// ─── approveCampaign ──────────────────────────────────────────────────────────

export async function approveCampaign(
  campaignId: string,
  approvedBy: string,
  approvedVariationIds?: string[]
): Promise<void> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  await db.from("campaigns").update({
    status:      "approved",
    approved_at: now,
    approved_by: approvedBy,
  }).eq("id", campaignId);

  // Approve individual variations if specified, otherwise approve all
  if (approvedVariationIds?.length) {
    await db.from("ad_variations")
      .update({ approved: true, approved_at: now, approved_by: approvedBy })
      .in("id", approvedVariationIds);
  } else {
    await db.from("ad_variations")
      .update({ approved: true, approved_at: now, approved_by: approvedBy })
      .eq("campaign_id", campaignId);
  }
}

// ─── ingestCampaignLead ───────────────────────────────────────────────────────
// Called when a lead comes in from an ad campaign.
// Creates the lead record and immediately queues first-contact follow-up.

export async function ingestCampaignLead(payload: {
  property_id:   string;
  campaign_id:   string;
  name:          string;
  phone:         string;
  email?:        string;
  utm_source?:   string;
  utm_medium?:   string;
  utm_campaign?: string;
}): Promise<string> {
  const db = getSupabaseAdmin();

  const { data: lead, error } = await db
    .from("leads")
    .insert({
      property_id:  payload.property_id,
      name:         payload.name,
      phone:        payload.phone,
      email:        payload.email ?? null,
      source:       "campaign",
      status:       "new",
      campaign_id:  payload.campaign_id,
      utm_source:   payload.utm_source ?? null,
      utm_medium:   payload.utm_medium ?? null,
      utm_campaign: payload.utm_campaign ?? null,
    })
    .select("id")
    .single();

  if (error || !lead) throw new Error(`Failed to create campaign lead: ${error?.message}`);

  // Increment campaign lead counter
  await db.rpc("increment_campaign_leads", { campaign_id: payload.campaign_id });

  // Queue immediate first-contact follow-up
  await queueFollowUp(lead.id, payload.property_id, "first_contact", new Date(), 1);

  return lead.id;
}
