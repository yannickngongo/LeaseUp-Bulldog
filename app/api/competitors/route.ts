// GET    /api/competitors?email=&property_id=  — list for a property
// POST   /api/competitors                       — create
// PATCH  /api/competitors                       — update (body: { email, id, ...fields })
// DELETE /api/competitors?email=&id=            — delete

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const email       = req.nextUrl.searchParams.get("email");
  const property_id = req.nextUrl.searchParams.get("property_id");
  if (!email || !property_id)
    return NextResponse.json({ error: "email and property_id required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("competitors")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .eq("property_id", property_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ competitors: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    email, property_id, name, address, their_low, their_high,
    concession, units_available, threat_level, notes,
    distance_miles, website_url, property_name,
  } = body;
  if (!email || !property_id || !name || their_low == null || their_high == null)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("competitors")
    .insert({
      operator_id:      ctx.operatorId,
      property_id,
      name:             name.trim(),
      address:          address?.trim() || null,
      their_low:        parseInt(their_low),
      their_high:       parseInt(their_high),
      concession:       concession?.trim() || null,
      units_available:  units_available ? parseInt(units_available) : null,
      threat_level:     threat_level ?? "medium",
      notes:            notes?.trim() || null,
      last_updated:     new Date().toISOString(),
      distance_miles:   distance_miles ?? null,
      website_url:      website_url ?? null,
      property_name:    property_name?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ competitor: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { email, id, ...fields } = body;
  if (!email || !id) return NextResponse.json({ error: "email and id required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = ["name", "address", "their_low", "their_high", "concession", "units_available", "threat_level", "notes", "property_name", "website_url", "distance_miles"];
  const updates: Record<string, unknown> = { last_updated: new Date().toISOString() };
  for (const key of allowed) {
    if (key in fields) updates[key] = fields[key] === "" ? null : fields[key];
  }
  if (updates.their_low != null) updates.their_low = parseInt(updates.their_low as string);
  if (updates.their_high != null) updates.their_high = parseInt(updates.their_high as string);
  if (updates.units_available != null && updates.units_available !== null)
    updates.units_available = parseInt(updates.units_available as string);

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("competitors")
    .update(updates)
    .eq("id", id)
    .eq("operator_id", ctx.operatorId)
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
