// POST /api/ai/copilot — leasing co-pilot AI chat
// Answers operator questions about their portfolio, leads, and drafts messages

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { question, operator_id } = await req.json() as { question: string; operator_id: string };
  if (!question || !operator_id) return NextResponse.json({ error: "question and operator_id required" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Gather operator context
  const [{ data: op }, { data: props }, { data: leads }] = await Promise.all([
    db.from("operators").select("name, email").eq("id", operator_id).single(),
    db.from("properties").select("id, name, city, state, total_units, occupied_units").eq("operator_id", operator_id),
    db.from("leads").select("id, name, status, property_id, created_at, last_contacted_at").in(
      "property_id",
      (await db.from("properties").select("id").eq("operator_id", operator_id)).data?.map(p => p.id) ?? []
    ).neq("status", "lost").limit(50),
  ]);

  const propSummary = (props ?? []).map(p => {
    const occ = p.total_units && p.occupied_units != null
      ? `${Math.round((p.occupied_units / p.total_units) * 100)}% occupied (${p.occupied_units}/${p.total_units})`
      : "occupancy unknown";
    return `- ${p.name} (${p.city}, ${p.state}): ${occ}`;
  }).join("\n");

  const leadsByStatus = (leads ?? []).reduce((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const leadSummary = Object.entries(leadsByStatus).map(([s, n]) => `${n} ${s}`).join(", ");

  const systemPrompt = `You are the LUB Co-Pilot — an AI assistant built into LeaseUp Bulldog, a multifamily leasing platform.

You're helping ${op?.name ?? "the property manager"} manage their portfolio. Here is their current data:

PROPERTIES:
${propSummary || "No properties yet"}

ACTIVE LEADS: ${leadSummary || "No active leads"}

You can help with:
- Answering questions about their properties and portfolio performance
- Drafting SMS/email messages to prospects or tenants
- Suggesting strategies to improve occupancy
- Explaining lead status and what to do next
- Any leasing or property management question

Be concise, direct, and practical. When drafting messages, provide the exact text ready to send. When giving advice, give specific actions not vague suggestions.`;

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model:     "claude-sonnet-4-6",
      max_tokens: 1024,
      system:    systemPrompt,
      messages:  [{ role: "user", content: question }],
    });

    const answer = (response.content[0] as { type: string; text: string }).text;
    return NextResponse.json({ ok: true, answer });
  } catch (err) {
    console.error("Copilot failed:", err);
    return NextResponse.json({ error: "Co-pilot unavailable. Try again." }, { status: 500 });
  }
}
