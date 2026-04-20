// POST /api/ai/portfolio-report — Claude generates a shareable owner report

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    operator_name,
    properties,
    totalLeads,
    wonLeads,
    activeLeads,
    aiReplies,
    estimatedRevenue,
    portfolioOccPct,
    totalUnits,
    occupiedCount,
    sources,
    period = "last 30 days",
  } = body;

  const propSummary = properties.map((p: { name: string; city: string; state: string; total_units: number; occupied_units: number }) => {
    const occ = p.total_units && p.occupied_units != null
      ? `${Math.round((p.occupied_units / p.total_units) * 100)}%`
      : "unknown";
    return `- ${p.name} (${p.city}, ${p.state}): ${occ} occupancy (${p.occupied_units ?? "?"}/${p.total_units ?? "?"} units)`;
  }).join("\n");

  const topSource = sources?.[0]?.name ?? "Direct";

  const prompt = `You are writing a professional monthly portfolio performance report for a multifamily property operator. Keep it concise, confident, and data-driven. Avoid filler phrases.

OPERATOR: ${operator_name}
PERIOD: ${period}
PROPERTIES:
${propSummary || "No properties"}

KEY METRICS:
- Portfolio occupancy: ${portfolioOccPct ?? "unknown"}% (${occupiedCount}/${totalUnits} units)
- Estimated monthly revenue: $${estimatedRevenue?.toLocaleString() ?? 0}
- Total leads: ${totalLeads} (${activeLeads} active, ${wonLeads} converted to leases)
- AI replied to ${aiReplies} inbound inquiries automatically
- Top lead source: ${topSource}

Write a structured JSON report with these exact fields:
{
  "headline": "<one punchy sentence summarizing portfolio performance>",
  "performance_rating": "<Excellent | Strong | Steady | Needs Attention>",
  "highlights": ["<3 bullet points — specific wins this period>"],
  "risks": ["<2-3 bullet points — things that need attention>"],
  "ai_impact": "<2 sentences on what LUB AI did for the operator this period>",
  "recommendations": ["<3 specific action items for next month>"],
  "outlook": "<1 sentence on what the portfolio can expect next month if these actions are taken>",
  "kpi_callout": "<one memorable stat to share with property owners>"
}

Return ONLY the raw JSON object.`;

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 800,
      messages:   [{ role: "user", content: prompt }],
    });

    let text = (response.content[0] as { type: string; text: string }).text.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!text.startsWith("{")) {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON");
      text = m[0];
    }

    const report = JSON.parse(text);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    console.error("Portfolio report failed:", err);
    return NextResponse.json({ error: "Report generation failed." }, { status: 500 });
  }
}
