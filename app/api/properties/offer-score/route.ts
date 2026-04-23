// POST /api/properties/offer-score
// Scores operator's offer idea vs AI-recommended offer with real market-driven performance estimates

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    property_name, city, state, neighborhood,
    current_occupancy_pct, total_units, occupied_units,
    unit_types, avg_rents,
    your_offer, monthly_budget,
    competitors,
  } = body as {
    property_name: string;
    city: string;
    state: string;
    neighborhood?: string;
    current_occupancy_pct: number;
    total_units: number;
    occupied_units: number;
    unit_types: string[];
    avg_rents: Record<string, number>;
    your_offer: string;
    monthly_budget: number;
    competitors?: { name: string; est_rent_range: string; key_amenities: string[]; threat_level: string }[];
  };

  const client = new Anthropic();

  const vacant = total_units - occupied_units;
  const rentSummary = unit_types.map(t => `${t}: $${avg_rents[t] ?? "unknown"}/mo`).join(", ");
  const compSummary = competitors?.length
    ? competitors.map(c => `- ${c.name}: ${c.est_rent_range}, amenities: ${c.key_amenities.join(", ")}`).join("\n")
    : "No competitor data available.";

  const prompt = `You are an elite multifamily leasing strategist. Your recommended offer must always be exceptional — minimum grade A-, score 9 or 10. If you cannot devise a genuinely A- offer for this market, keep refining until you can. Average is unacceptable.

Analyze this operator's offer and produce a rigorous, market-grounded comparison.

PROPERTY: ${property_name}
LOCATION: ${city}, ${state}${neighborhood ? ` (${neighborhood})` : ""}
CURRENT OCCUPANCY: ${current_occupancy_pct}% (${occupied_units}/${total_units} units — ${vacant} vacant)
RENTS: ${rentSummary}
MONTHLY AD BUDGET: $${monthly_budget}

KNOWN COMPETITORS:
${compSummary}

OPERATOR'S PROPOSED OFFER: "${your_offer}"

Your job:
1. Score the operator's offer against actual ${city}, ${state} market conditions, seasonal demand, and competitor positioning
2. Devise the single best alternative offer you would run instead — something specific, creative, and market-optimized
3. Estimate realistic performance for BOTH offers at the $${monthly_budget}/mo budget, using conservative multifamily benchmarks (CPL ~$40-80, lead-to-lease ~18-25%)

Return ONLY this raw JSON:

{
  "your_offer": {
    "label": "${your_offer}",
    "score": <1-10 integer>,
    "grade": "<A+|A|A-|B+|B|B-|C+|C|C-|D|F>",
    "rationale": "<2 sentences: why this score given this specific market>",
    "strengths": ["<2 specific strengths>"],
    "weaknesses": ["<2 specific weaknesses given competitor landscape>"],
    "metrics": {
      "expected_inquiries_90d": <realistic integer>,
      "expected_leases_90d": <realistic integer>,
      "cost_per_lease": <realistic integer in dollars>,
      "occupancy_gain_90d": <percentage points, integer>,
      "monthly_revenue_impact": <net monthly revenue change in dollars, integer>
    }
  },
  "recommended_offer": {
    "label": "<specific, compelling offer name>",
    "description": "<exactly what the offer is — specific terms, e.g. '6 weeks free on 13-month lease + $0 security deposit'>",
    "score": <9 or 10 — the recommended offer must always be elite>,
    "grade": "<must be A- or higher: A+, A, or A->",
    "rationale": "<2 sentences: why this outperforms in this specific market>",
    "strengths": ["<3 specific strengths>"],
    "why_better_than_yours": "<1 sentence: the key reason it beats the operator's offer>",
    "metrics": {
      "expected_inquiries_90d": <realistic integer, higher than your_offer>,
      "expected_leases_90d": <realistic integer, higher than your_offer>,
      "cost_per_lease": <realistic integer, lower than your_offer>,
      "occupancy_gain_90d": <percentage points, higher than your_offer>,
      "monthly_revenue_impact": <higher than your_offer>
    }
  },
  "market_context": "<2 sentences: what's happening in ${city}, ${state} multifamily right now that makes this the right call>",
  "budget_verdict": "<1 sentence: is $${monthly_budget}/mo enough to hit 95% occupancy in 90 days, and if not, what budget would>",
  "recommended_channels": ["<3 specific ad channels best for this market and offer>"]
}

Be specific to ${city}, ${state}. Use real multifamily benchmarks. Make the recommended offer genuinely better — not just a tweak.`;

  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1600,
      messages:   [{ role: "user", content: prompt }],
    });

    let text = (response.content[0] as { type: string; text: string }).text.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!text.startsWith("{")) {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON in response");
      text = m[0];
    }

    return NextResponse.json({ ok: true, ...JSON.parse(text) });
  } catch (err) {
    console.error("Offer scoring failed:", err);
    return NextResponse.json({ error: "Scoring failed. Try again." }, { status: 500 });
  }
}
