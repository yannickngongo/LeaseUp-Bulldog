// POST /api/intelligence/market-research
// Generates AI market analysis for a given property location

import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { propertyId, name, address, city, state, zip, neighborhood } = body;

  if (!city || !state) {
    return NextResponse.json({ error: "city and state required" }, { status: 400 });
  }

  // Use neighborhood when available — far more precise than ZIP for market analysis
  const location = neighborhood
    ? `${neighborhood}, ${city}, ${state}`
    : zip
      ? `${city}, ${state} ${zip}`
      : `${city}, ${state}`;

  const locationLabel = neighborhood
    ? `the ${neighborhood} neighborhood of ${city}, ${state}`
    : zip
      ? `${city}, ${state} (ZIP ${zip})`
      : `${city}, ${state}`;

  const prompt = `You are a multifamily real estate market analyst. Provide a concise, data-informed market analysis for rental properties in ${locationLabel}.

Property context: ${name ?? "Apartment community"} located at ${address ?? location}.${neighborhood ? `\nNeighborhood: ${neighborhood} — focus your analysis specifically on this sub-market, not just the broader city.` : ""}

Return a JSON object with this exact structure:
{
  "marketSummary": "2-3 sentence overview of the current rental market in this specific neighborhood/area",
  "avgRent1BR": "estimated average 1BR rent range for this neighborhood, e.g. $1,200–$1,450/mo",
  "avgRent2BR": "estimated average 2BR rent range for this neighborhood",
  "vacancyRate": "estimated vacancy rate for this neighborhood, e.g. 4.2%",
  "marketTrend": "one of: 'strong_demand', 'stable', 'softening'",
  "trendLabel": "e.g. 'Strong Demand' or 'Softening'",
  "yoyRentGrowth": "estimated YoY rent growth for this neighborhood, e.g. +3.8%",
  "demandDrivers": ["up to 3 short bullet points about what's driving demand in this specific neighborhood"],
  "competitiveThreats": ["up to 2 short bullet points about competitive pressures or risks in this neighborhood"],
  "recommendation": "1 sentence tactical recommendation for this property's leasing strategy based on neighborhood dynamics"
}

Use your training knowledge about this market. Be as specific as possible to the neighborhood level. Return only the JSON object, no markdown.`;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
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

    return NextResponse.json({ ok: true, analysis, propertyId, location, neighborhood: neighborhood ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
