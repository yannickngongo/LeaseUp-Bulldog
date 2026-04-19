import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { qualifyLead } from "@/lib/ai/qualify-lead";

// POST /api/ai/qualify — run AI qualification on a lead
// Body: { lead_id: string }
export async function POST(req: NextRequest) {
  const { lead_id } = await req.json();

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Fetch the lead
  const { data: lead, error: leadError } = await db
    .from("leads")
    .select("*")
    .eq("id", lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Fetch conversation history
  const { data: conversations } = await db
    .from("conversations")
    .select("direction, body, created_at")
    .eq("lead_id", lead_id)
    .order("created_at", { ascending: true });

  const history =
    conversations
      ?.map((c) => `[${c.direction.toUpperCase()}]: ${c.body}`)
      .join("\n") ?? "";

  // Run AI qualification
  const result = await qualifyLead(lead, history);

  // Save results back to the lead
  await db
    .from("leads")
    .update({
      ai_score: result.score,
      ai_summary: result.summary,
      move_in_date: result.move_in_date ?? lead.move_in_date,
      budget_min: result.budget_min ?? lead.budget_min,
      budget_max: result.budget_max ?? lead.budget_max,
      bedrooms: result.bedrooms ?? lead.bedrooms,
      pets: result.pets ?? lead.pets,
    })
    .eq("id", lead_id);

  return NextResponse.json({ result });
}
