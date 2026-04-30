// GET  /api/properties/[id]/units  — list all units for a property
// POST /api/properties/[id]/units  — bulk upsert units from rent roll, recalculate occupancy
// Tenant-scoped: only the operator who owns the property can read/write.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authorizeProperty } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authorizeProperty(req, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("units")
    .select("*")
    .eq("property_id", id)
    .order("unit_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ units: data ?? [] });
}

interface UnitRow {
  unit_name:        string;
  unit_type?:       string;
  bedrooms?:        number | null;
  sq_ft?:           number | null;
  status:           string;
  current_resident?: string | null;
  lease_start?:     string | null;
  lease_end?:       string | null;
  monthly_rent?:    number | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authorizeProperty(req, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const units: UnitRow[] = body.units;

  if (!Array.isArray(units) || units.length === 0) {
    return NextResponse.json({ error: "units array required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Upsert all units (insert or update by unit_name within this property)
  const rows = units.map((u) => ({
    property_id:      id,
    unit_name:        u.unit_name.trim(),
    unit_type:        u.unit_type?.toLowerCase() ?? null,
    bedrooms:         u.bedrooms ?? null,
    sq_ft:            u.sq_ft ?? null,
    status:           u.status?.toLowerCase() ?? "vacant",
    current_resident: u.current_resident?.trim() || null,
    lease_start:      u.lease_start || null,
    lease_end:        u.lease_end || null,
    monthly_rent:     u.monthly_rent ?? null,
  }));

  const { error: upsertErr } = await db
    .from("units")
    .upsert(rows, { onConflict: "property_id,unit_name" });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  // Recalculate occupancy from all units for this property
  const { data: allUnits } = await db
    .from("units")
    .select("status")
    .eq("property_id", id);

  const total    = allUnits?.length ?? 0;
  const occupied = (allUnits ?? []).filter(u =>
    u.status === "occupied" || u.status === "notice"
  ).length;

  await db
    .from("properties")
    .update({ total_units: total, occupied_units: occupied })
    .eq("id", id);

  return NextResponse.json({ ok: true, total, occupied, upserted: rows.length });
}
