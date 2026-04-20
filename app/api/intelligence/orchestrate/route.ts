// POST /api/intelligence/orchestrate — run full property orchestration
// GET  /api/intelligence/orchestrate?property_id=... — get latest run

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { runPropertyOrchestration } from "@/lib/orchestration";
import { populateQueueFromOrchestration } from "@/lib/action-queue";

export async function POST(req: NextRequest) {
  const { property_id, operator_id } = await req.json();
  if (!property_id || !operator_id) {
    return NextResponse.json({ error: "property_id and operator_id required" }, { status: 400 });
  }

  const result = await runPropertyOrchestration(property_id);
  await populateQueueFromOrchestration(property_id, operator_id, result.runId);

  return NextResponse.json({ ok: true, result });
}

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get("property_id");
  if (!propertyId) return NextResponse.json({ error: "property_id required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("orchestration_runs")
    .select("*, orchestration_findings(*), orchestration_actions(*)")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ ok: true, run: data });
}
