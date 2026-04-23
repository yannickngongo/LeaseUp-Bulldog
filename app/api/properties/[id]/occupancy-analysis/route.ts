// POST /api/properties/[id]/occupancy-analysis
// Calls Claude to generate an occupancy health score, market analysis,
// diagnosis, and prioritized action plan for a property.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface UnitInput {
  unit_type?: string | null;
  status: string;
  monthly_rent?: number | null;
  lease_end?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;

  const body = await req.json();
  const { property, occupancy, pipeline, units } = body as {
    property: { name: string; address: string; city: string; state: string; neighborhood?: string };
    occupancy: { total: number; occupied: number; vacant: number; notice: number; occupancy_pct: number };
    pipeline: { active_leads: number; tours: number; applications: number; won: number };
    units: UnitInput[];
  };

  // Derive unit mix and avg rent from units array
  const mixMap: Record<string, number> = {};
  for (const u of units) {
    const t = u.unit_type ?? "unknown";
    mixMap[t] = (mixMap[t] ?? 0) + 1;
  }
  const unitMix = Object.entries(mixMap).map(([t, n]) => `${n}× ${t}`).join(", ");

  const rentList = units.filter(u => u.monthly_rent).map(u => u.monthly_rent as number);
  const avgRent  = rentList.length > 0
    ? Math.round(rentList.reduce((a, b) => a + b, 0) / rentList.length)
    : null;

  const client = new Anthropic();

  const prompt = `You are a multifamily real estate analytics expert. Analyze this property's occupancy situation and return ONLY a raw JSON object — no markdown fences, no prose before or after.

PROPERTY
Name: ${property.name}
Location: ${property.address}, ${property.city}, ${property.state}${property.neighborhood ? ` (${property.neighborhood})` : ""}

OCCUPANCY
Current: ${occupancy.occupancy_pct}% — ${occupancy.occupied}/${occupancy.total} units
Vacant: ${occupancy.vacant} | On notice (pending vacancy): ${occupancy.notice}
${avgRent ? `Avg rent: $${avgRent}/mo` : ""}
${unitMix ? `Unit mix: ${unitMix}` : ""}

PIPELINE
Active leads: ${pipeline.active_leads} | Tours: ${pipeline.tours} | Applications: ${pipeline.applications} | Move-ins won: ${pipeline.won}

Return this exact JSON structure:
{
  "score": <integer 0–100 reflecting overall occupancy health>,
  "score_label": <"Critical" | "At Risk" | "Fair" | "Good" | "Excellent">,
  "diagnosis": [<3–5 strings — each one specific finding about what is hurting or helping occupancy>],
  "market_analysis": "<2–3 sentences on the ${property.city}, ${property.state} multifamily submarket: demand drivers, vacancy trends, seasonality, how this property compares to market>",
  "suggestions": [
    {
      "priority": <"high" | "medium" | "low">,
      "title": "<short action label>",
      "body": "<1–2 sentences — concrete, specific recommendation>",
      "impact": "<expected outcome, e.g. '+3–5% occupancy in 30 days'>"
    }
  ]
}

Score rubric: 90–100 = Excellent, 80–89 = Good, 70–79 = Fair, 60–69 = At Risk, <60 = Critical.
Include 5–6 suggestions ordered high→low priority covering: pricing/concessions, marketing channels, lead nurturing, lease renewals, referral program, property improvements.`;

  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages:   [{ role: "user", content: prompt }],
    });

    let text = (response.content[0] as { type: string; text: string }).text.trim();

    // Strip any accidental markdown fences
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    // Extract JSON object if surrounded by prose
    if (!text.startsWith("{")) {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON object in response");
      text = m[0];
    }

    const analysis = JSON.parse(text);
    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    console.error("Occupancy analysis failed:", err);
    return NextResponse.json({ error: "Analysis failed. Try again." }, { status: 500 });
  }
}
