// GET /api/units?email=...
// Returns avg_rent per property for the operator, computed from real unit data

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ avgRentByProperty: {} });

  const db = getSupabaseAdmin();

  const { data: units, error } = await db
    .from("units")
    .select("property_id, monthly_rent, properties!inner(operator_id)")
    .eq("properties.operator_id", ctx.operatorId)
    .not("monthly_rent", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group and average monthly_rent per property
  const grouped: Record<string, number[]> = {};
  for (const unit of units ?? []) {
    const pid = unit.property_id;
    if (!pid) continue;
    if (!grouped[pid]) grouped[pid] = [];
    if (unit.monthly_rent) grouped[pid].push(unit.monthly_rent);
  }

  const avgRentByProperty: Record<string, number> = {};
  for (const [pid, rents] of Object.entries(grouped)) {
    if (rents.length > 0) {
      avgRentByProperty[pid] = Math.round(rents.reduce((s, r) => s + r, 0) / rents.length);
    }
  }

  return NextResponse.json({ avgRentByProperty });
}
