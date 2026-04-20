// POST /api/intelligence/what-if — simulate a strategy scenario
// GET  /api/intelligence/what-if?property_id=... — list recent simulations

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { simulateScenario, compareScenarios } from "@/lib/what-if";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { property_id, scenario, compare_with } = body;

  if (!property_id || !scenario) {
    return NextResponse.json({ error: "property_id and scenario required" }, { status: 400 });
  }

  if (compare_with) {
    const comparison = await compareScenarios(property_id, [scenario, compare_with]);
    return NextResponse.json({ ok: true, comparison });
  }

  const result = await simulateScenario(property_id, scenario);
  return NextResponse.json({ ok: true, result });
}

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get("property_id");
  if (!propertyId) return NextResponse.json({ error: "property_id required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("what_if_runs")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ ok: true, simulations: data ?? [] });
}
