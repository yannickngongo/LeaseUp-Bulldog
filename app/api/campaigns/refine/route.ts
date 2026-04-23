// POST /api/campaigns/refine
// Takes an existing campaign draft + user feedback, returns an updated version.
// Powers the "what should change?" feedback loop in AI-Assisted mode.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { current_draft, feedback, property_name, city, state } = body as {
    current_draft: {
      headline: string;
      subheadline: string;
      body_copy: string;
      offer: string;
      cta: string;
      messaging_angle: string;
      recommended_channels: string[];
      recommended_monthly_budget: number;
      predicted_leads_30d: number;
      predicted_leases_30d: number;
    };
    feedback: string;
    property_name: string;
    city: string;
    state: string;
  };

  const client = new Anthropic();

  const prompt = `You are a multifamily ad strategist. Refine this campaign based on the operator's feedback.

PROPERTY: ${property_name} — ${city}, ${state}

CURRENT CAMPAIGN:
Headline: "${current_draft.headline}"
Subheadline: "${current_draft.subheadline}"
Body: "${current_draft.body_copy}"
Offer: "${current_draft.offer}"
CTA: "${current_draft.cta}"
Angle: "${current_draft.messaging_angle}"

OPERATOR FEEDBACK: "${feedback}"

Apply the feedback precisely. Keep what's working, change only what the operator asked to change. If the feedback would hurt performance, note it in the rationale but still apply it.

Return ONLY this raw JSON (same structure as before):

{
  "ai_version": {
    "headline": "<updated headline>",
    "subheadline": "<updated subheadline>",
    "body_copy": "<updated body>",
    "offer": "<updated offer>",
    "cta": "<updated cta>",
    "messaging_angle": "<updated angle>",
    "recommended_channels": ${JSON.stringify(current_draft.recommended_channels)},
    "recommended_monthly_budget": ${current_draft.recommended_monthly_budget},
    "predicted_leads_30d": <updated integer>,
    "predicted_leases_30d": <updated integer>,
    "rationale": "<1-2 sentences: what changed and why>"
  }
}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });

    let text = (response.content[0] as { type: string; text: string }).text.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!text.startsWith("{")) {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON");
      text = m[0];
    }

    return NextResponse.json({ ok: true, ...JSON.parse(text) });
  } catch (err) {
    console.error("Campaign refine failed:", err);
    return NextResponse.json({ error: "Refinement failed. Try again." }, { status: 500 });
  }
}
