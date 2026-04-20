// POST /api/intelligence/market-research
// Generates AI market analysis for a given property location

import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { propertyId, name, address, city, state, zip } = body;

  if (!city || !state) {
    return NextResponse.json({ error: "city and state required" }, { status: 400 });
  }

  const location = zip ? `${city}, ${state} ${zip}` : `${city}, ${state}`;

  const prompt = `You are a multifamily real estate market analyst. Provide a concise, data-informed market analysis for rental properties in ${location}.

Property context: ${name ?? "Apartment community"} located at ${address ?? location}.

Return a JSON object with this exact structure:
{
  "marketSummary": "2-3 sentence overview of the current rental market in this area",
  "avgRent1BR": "estimated average 1BR rent range, e.g. $1,200–$1,450/mo",
  "avgRent2BR": "estimated average 2BR rent range",
  "vacancyRate": "estimated vacancy rate, e.g. 4.2%",
  "marketTrend": "one of: 'strong_demand', 'stable', 'softening'",
  "trendLabel": "e.g. 'Strong Demand' or 'Softening'",
  "yoyRentGrowth": "estimated YoY rent growth, e.g. +3.8%",
  "demandDrivers": ["up to 3 short bullet points about what's driving demand in this market"],
  "competitiveThreats": ["up to 2 short bullet points about competitive pressures or risks"],
  "recommendation": "1 sentence tactical recommendation for this property's leasing strategy"
}

Use your training knowledge about this market. Be specific and accurate for ${location}. Return only the JSON object, no markdown.`;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    if (block.type !== "text") throw new Error("Unexpected response type");

    let analysis;
    try {
      const text = block.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
      analysis = JSON.parse(text);
    } catch {
      analysis = { marketSummary: block.text, error: "parse_failed" };
    }

    return NextResponse.json({ ok: true, analysis, propertyId, location });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
