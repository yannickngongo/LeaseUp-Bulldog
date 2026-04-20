// POST /api/intelligence/optimize — run "Optimize My Property"
// GET  /api/intelligence/optimize?property_id=... — get latest plan

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { optimizeProperty } from "@/lib/optimize-property";

export async function POST(req: NextRequest) {
  const { property_id } = await req.json();
  if (!property_id) return NextResponse.json({ error: "property_id required" }, { status: 400 });

  const plan = await optimizeProperty(property_id);
  return NextResponse.json({ ok: true, plan });
}

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get("property_id");
  if (!propertyId) return NextResponse.json({ error: "property_id required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("optimize_property_runs")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ ok: true, run: data });
}
