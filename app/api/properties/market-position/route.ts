// POST /api/properties/market-position
// AI-powered market benchmarking: compares property rents vs estimated market averages

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface UnitRentData {
  unit_type: string;
  count: number;
  avg_rent: number | null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { property_name, city, state, neighborhood, unit_rents } = body as {
    property_name: string;
    city: string;
    state: string;
    neighborhood?: string;
    unit_rents: UnitRentData[];
  };

  const client = new Anthropic();

  const rentSummary = unit_rents.map(u =>
    `${u.unit_type}: ${u.count} units @ ${u.avg_rent ? `$${u.avg_rent}/mo avg` : "rent unknown"}`
  ).join("\n");

  const prompt = `You are a multifamily real estate market analyst. Provide a competitive rent benchmarking analysis for this property vs the local market.

PROPERTY: ${property_name}
LOCATION: ${city}, ${state}${neighborhood ? ` (${neighborhood})` : ""}

CURRENT RENTS:
${rentSummary || "No rent data available"}

Based on your knowledge of the ${city}, ${state} multifamily market, provide estimated market averages and competitive positioning. Return ONLY a raw JSON object:

{
  "market_summary": "<2 sentences on overall rent trends in ${city}, ${state}>",
  "benchmarks": [
    {
      "unit_type": "<e.g. studio, 1br, 2br, 3br>",
      "market_avg_rent": <integer — estimated average market rent for this unit type in this city>,
      "market_low": <integer — low end of market range>,
      "market_high": <integer — high end of market range>,
      "property_rent": <integer or null — property's current average rent for this type, from the data provided>,
      "vs_market_pct": <number — how much property rent is vs market, e.g. -3.5 means 3.5% below market, +5.2 means 5.2% above>,
      "recommendation": "<one short sentence: raise, hold, or lower, and by how much>"
    }
  ],
  "pricing_strategy": "<2-3 sentences: overall pricing recommendation for this property to maximize occupancy and revenue>",
  "demand_outlook": "<1 sentence: near-term demand forecast for this submarket>"
}

Only include unit types present in the property's data. If property rent is null for a type, still include market data with property_rent: null.`;

  try {
    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1200,
      messages:   [{ role: "user", content: prompt }],
    });

    let text = (response.content[0] as { type: string; text: string }).text.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!text.startsWith("{")) {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON in response");
      text = m[0];
    }

    const result = JSON.parse(text);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Market position failed:", err);
    return NextResponse.json({ error: "Analysis failed. Try again." }, { status: 500 });
  }
}
