// GET  /api/competitors?email=&property_id=  — list competitors for a property
// POST /api/competitors                       — create a competitor
// DELETE /api/competitors?id=&email=          — delete a competitor

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const email      = req.nextUrl.searchParams.get("email");
  const propertyId = req.nextUrl.searchParams.get("property_id");
  if (!email || !propertyId) return NextResponse.json({ error: "email and property_id required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ competitors: [] });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("competitors")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ competitors: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, property_id, name, address, zip_code, city, state, their_low, their_high, threat_level, key_amenities } = body;
  if (!email || !property_id || !name || !their_low || !their_high) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("competitors")
    .insert({
      operator_id: ctx.operatorId,
      property_id,
      name,
      address:       address ?? null,
      zip_code:      zip_code ?? null,
      city:          city ?? "",
      state:         state ?? "",
      their_low,
      their_high,
      threat_level:  threat_level ?? "medium",
      key_amenities: key_amenities ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ competitor: data });
}

export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const id    = req.nextUrl.searchParams.get("id");
  if (!email || !id) return NextResponse.json({ error: "email and id required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("competitors")
    .delete()
    .eq("id", id)
    .eq("operator_id", ctx.operatorId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
