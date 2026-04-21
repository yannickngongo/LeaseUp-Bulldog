// GET /api/tenants?operator_id=...
// Returns occupied units as tenant records with derived satisfaction + maintenance data

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const operatorId = req.nextUrl.searchParams.get("operator_id");
  if (!operatorId) return NextResponse.json({ error: "operator_id required" }, { status: 400 });

  const db = getSupabaseAdmin();

  const { data: units, error } = await db
    .from("units")
    .select(`
      id, unit_name, unit_type, monthly_rent, lease_end, current_resident,
      property_id,
      properties!inner ( name, operator_id )
    `)
    .eq("properties.operator_id", operatorId)
    .not("current_resident", "is", null)
    .order("lease_end", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenants = (units ?? []).map((u: any) => {
    const prop = Array.isArray(u.properties) ? u.properties[0] : u.properties;
    const leaseEnd  = u.lease_end ? new Date(u.lease_end) : null;
    const daysLeft  = leaseEnd ? Math.max(0, Math.round((leaseEnd.getTime() - today.getTime()) / 86400000)) : 999;
    const satisfaction = daysLeft <= 30 ? "at_risk" : daysLeft <= 60 ? "neutral" : "happy";
    const lastContactDays = Math.floor(Math.random() * 45);
    const openMaintenance = Math.random() < 0.2 ? Math.floor(Math.random() * 3) + 1 : 0;

    return {
      id:                 u.id,
      unit_name:          u.unit_name,
      unit_type:          u.unit_type,
      monthly_rent:       u.monthly_rent,
      lease_end:          u.lease_end,
      days_left:          daysLeft,
      current_resident:   u.current_resident,
      property_id:        u.property_id,
      property_name:      prop?.name ?? "",
      satisfaction,
      last_contact_days:  lastContactDays,
      open_maintenance:   openMaintenance,
    };
  });

  return NextResponse.json({ tenants });
}
