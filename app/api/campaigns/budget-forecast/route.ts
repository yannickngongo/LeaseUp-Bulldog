// POST /api/campaigns/budget-forecast
// AI-powered ad budget forecast: given spend + duration, returns reach, leads, move-ins, occupancy projection, date to 90%

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    budget,
    duration_days,
    channel,
    current_occupancy_pct,
    vacant_units,
    total_units,
    city,
    state,
    property_name,
  } = body as {
    budget: number;
    duration_days: number;
    channel: string;
    current_occupancy_pct: number;
    vacant_units: number;
    total_units: number;
    city: string;
    state: string;
    property_name: string;
  };

  const client = new Anthropic();

  const prompt = `You are a digital advertising expert specializing in multifamily real estate. A property manager wants to run a paid ad for ${property_name} in ${city}, ${state}.

PROPERTY DATA:
- Current occupancy: ${current_occupancy_pct}% (${total_units - vacant_units}/${total_units} units occupied)
- Vacant units: ${vacant_units}
- Target: 90% occupancy

AD CAMPAIGN:
- Platform: ${channel}
- Budget: $${budget} total
- Duration: ${duration_days} days

INDUSTRY BENCHMARKS (apply these to your calculations):
- Facebook/Instagram CPM: $10–15 (cost per 1,000 impressions)
- Google Ads CPM: $5–10
- Multifamily apartment ad CTR: 1.0–2.5%
- Click-to-inquiry rate (prospect fills out form or calls): 15–25%
- Without AI: inquiry-to-tour 10–15%, tour-to-lease 25–35%
- With LUB AI (instant SMS qualification + follow-up): inquiry-to-tour 40–55%, tour-to-lease 35–45%
- LUB produces ~2.5–3× more signed leases per dollar vs traditional

Today's date: ${new Date().toISOString().split("T")[0]}

Return ONLY a raw JSON object with no prose, no markdown:
{
  "impressions": <integer>,
  "clicks": <integer>,
  "leads": <integer — people who inquire>,
  "conversions_with_lub": <integer — projected signed leases with LUB AI>,
  "conversions_without_lub": <integer — projected signed leases without LUB for comparison>,
  "cost_per_lead": <number — dollars per inquiry>,
  "cost_per_move_in": <number — dollars per signed lease with LUB>,
  "occupancy_impact_pct": <number — percentage points gained from move-ins, e.g. 3.5>,
  "new_occupancy_pct": <number — projected occupancy after campaign>,
  "days_to_90pct": <integer or null — estimated days until 90% at this spend rate; null if already ≥90%>,
  "reach_90pct_date": <"YYYY-MM-DD" string or null — absolute date; null if already ≥90%>,
  "summary": "<2 sentences: exactly how many people this budget reaches, how LUB turns that into leases, when they'll hit 90%. Be specific with numbers.>"
}`;

  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages:   [{ role: "user", content: prompt }],
    });

    let text = (response.content[0] as { type: string; text: string }).text.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!text.startsWith("{")) {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON in response");
      text = m[0];
    }

    const forecast = JSON.parse(text);
    return NextResponse.json({ ok: true, forecast });
  } catch (err) {
    console.error("Budget forecast failed:", err);
    return NextResponse.json({ error: "Forecast failed. Try again." }, { status: 500 });
  }
}
