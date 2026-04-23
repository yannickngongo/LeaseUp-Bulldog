// POST /api/campaigns/draft
// Generates a full campaign creative draft without saving to DB.
// Used for AI-Assisted and AI Autopilot modes — returns the creative content
// so the user can review, refine, or compare before committing.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Gate: marketing add-on required
  const operatorId = body.operator_id as string | undefined;
  if (operatorId) {
    const db = getSupabaseAdmin();
    const { data: sub } = await db
      .from("billing_subscriptions")
      .select("marketing_addon")
      .eq("operator_id", operatorId)
      .single();
    if (!sub?.marketing_addon) {
      return NextResponse.json({ error: "Marketing add-on required", upgrade: true }, { status: 403 });
    }
  }
  const {
    property_name, city, state, neighborhood,
    current_occupancy_pct, total_units, unit_types, avg_rents,
    goal_note, urgency,
    manual_version, // optional: if present, also grade the manual version
  } = body as {
    property_name: string;
    city: string;
    state: string;
    neighborhood?: string;
    current_occupancy_pct: number;
    total_units: number;
    unit_types?: string[];
    avg_rents?: Record<string, number>;
    goal_note?: string;
    urgency?: string;
    manual_version?: {
      headline: string;
      body: string;
      offer: string;
      cta: string;
    };
  };

  // Confidence score computed from real property data (0–100)
  // Factors: data completeness + occupancy pressure signal
  let confidenceScore = 40;
  const confidenceFactors: string[] = [];

  if (current_occupancy_pct != null) {
    confidenceScore += 10;
    confidenceFactors.push("Real occupancy data provided");
    if (current_occupancy_pct < 85) {
      confidenceScore += 12;
      confidenceFactors.push(`Occupancy at ${current_occupancy_pct}% — clear demand gap signals strong marketing ROI`);
    }
    if (current_occupancy_pct < 75) {
      confidenceScore += 5;
      confidenceFactors.push("Critical vacancy level increases response predictability");
    }
  } else {
    confidenceScore -= 10;
    confidenceFactors.push("No occupancy data — predictions less reliable");
  }

  if (avg_rents && Object.keys(avg_rents).length > 0) {
    confidenceScore += 10;
    confidenceFactors.push("Actual rent data anchors pricing strategy");
  } else {
    confidenceScore -= 5;
    confidenceFactors.push("No rent data — budget recommendations less precise");
  }

  if (unit_types && unit_types.length > 0) {
    confidenceScore += 5;
    confidenceFactors.push("Unit mix known — targeting segmented by bedroom type");
  }
  if (goal_note) {
    confidenceScore += 5;
    confidenceFactors.push("Clear campaign goal defined");
  }
  if (neighborhood) {
    confidenceScore += 5;
    confidenceFactors.push("Neighborhood context enables hyperlocal copy");
  }
  if (total_units >= 50) {
    confidenceScore += 5;
    confidenceFactors.push(`${total_units}-unit property — strong statistical signal`);
  } else if (total_units >= 20) {
    confidenceScore += 3;
    confidenceFactors.push(`${total_units}-unit property — moderate sample size`);
  }

  confidenceScore = Math.min(100, Math.max(0, confidenceScore));

  const client = new Anthropic();
  const rentSummary = (unit_types ?? []).map(t => `${t}: $${(avg_rents ?? {})[t] ?? "unknown"}/mo`).join(", ") || "not specified";

  const manualSection = manual_version
    ? `\nOPERATOR'S MANUAL VERSION:\nHeadline: "${manual_version.headline}"\nBody: "${manual_version.body}"\nOffer: "${manual_version.offer}"\nCTA: "${manual_version.cta}"\n\nPlease grade this version AND produce your own recommended version.\n`
    : "";

  const prompt = `You are a top multifamily advertising strategist. Create a high-converting campaign for the property below.
${manualSection}
PROPERTY: ${property_name}
LOCATION: ${city}, ${state}${neighborhood ? ` (${neighborhood})` : ""}
OCCUPANCY: ${current_occupancy_pct}% (${total_units} total units)
RENTS: ${rentSummary}
GOAL: ${goal_note || "Increase occupancy as fast as possible"}
URGENCY: ${urgency || "normal"}

Generate a campaign that speaks directly to renters in the ${city} market. Be specific — avoid generic copy.

Return ONLY this raw JSON:

{
  "ai_version": {
    "headline": "<punchy 6-10 word headline for the ad>",
    "subheadline": "<supporting line, 10-15 words>",
    "body_copy": "<2-3 sentence ad body — specific, benefit-driven, no fluff>",
    "offer": "<the exact offer/special to run — specific terms>",
    "cta": "<call-to-action button text, 3-5 words>",
    "messaging_angle": "<1 sentence: the core positioning angle>",
    "recommended_channels": ["<facebook|instagram|google>", "<second channel>"],
    "recommended_monthly_budget": <integer in dollars>,
    "predicted_leads_30d": <conservative integer>,
    "predicted_leases_30d": <conservative integer>,
    "rationale": "<2 sentences: why this creative will work in this specific market>"
  }${manual_version ? `,
  "manual_grade": {
    "grade": "<A+|A|A-|B+|B|B-|C+|C|C-|D|F>",
    "score": <1-10>,
    "strengths": ["<2 things that work>"],
    "weaknesses": ["<2 things that hurt conversion>"],
    "verdict": "<1 sentence comparing manual vs AI version>"
  }` : ""}
}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    let text = (response.content[0] as { type: string; text: string }).text.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!text.startsWith("{")) {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON");
      text = m[0];
    }

    return NextResponse.json({ ok: true, confidence_score: confidenceScore, confidence_factors: confidenceFactors, ...JSON.parse(text) });
  } catch (err) {
    console.error("Campaign draft failed:", err);
    return NextResponse.json({ error: "Draft generation failed. Try again." }, { status: 500 });
  }
}
