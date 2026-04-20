// POST /api/properties/market-competitors
// AI-powered competitor monitoring: identifies nearby competitors and their positioning

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { property_name, city, state, neighborhood, unit_types, avg_rents } = body as {
    property_name: string;
    city: string;
    state: string;
    neighborhood?: string;
    unit_types: string[];
    avg_rents: Record<string, number>;
  };

  const client = new Anthropic();

  const rentSummary = unit_types.map(t => `${t}: $${avg_rents[t] ?? "unknown"}/mo`).join(", ");

  const prompt = `You are a multifamily real estate market intelligence analyst. Identify competitive properties near the given property and provide actionable intel.

PROPERTY: ${property_name}
LOCATION: ${city}, ${state}${neighborhood ? ` (${neighborhood})` : ""}
CURRENT RENTS: ${rentSummary || "unknown"}

Based on your knowledge of the ${city}, ${state} multifamily market, identify likely competitors and competitive dynamics. Return ONLY a raw JSON object:

{
  "competitors": [
    {
      "name": "<competitor property name>",
      "distance": "<estimated distance, e.g. '0.3 miles'>",
      "unit_types": ["<e.g. 1br, 2br>"],
      "est_rent_range": "<e.g. $1,400–$1,800/mo>",
      "occupancy_estimate": "<e.g. 92% — typically full>",
      "key_amenities": ["<3 notable amenities>"],
      "threat_level": "<high | medium | low>",
      "threat_reason": "<one sentence: why this competitor matters or doesn't>"
    }
  ],
  "market_pressure": "<low | moderate | high | intense>",
  "competitive_summary": "<2 sentences: overall competitive landscape and biggest threat>",
  "your_advantages": ["<3 specific advantages ${property_name} has over competitors>"],
  "vulnerabilities": ["<2 areas where ${property_name} is at a disadvantage>"],
  "recommended_counters": ["<3 specific actions to differentiate from competition>"]
}

Include 3–5 realistic competitor properties. Be specific to ${city}, ${state}.`;

  try {
    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1400,
      messages:   [{ role: "user", content: prompt }],
    });

    let text = (response.content[0] as { type: string; text: string }).text.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!text.startsWith("{")) {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON");
      text = m[0];
    }

    const result = JSON.parse(text);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Competitor analysis failed:", err);
    return NextResponse.json({ error: "Analysis failed. Try again." }, { status: 500 });
  }
}
