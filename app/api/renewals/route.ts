// GET /api/renewals?email=... — returns units with leases expiring in next 90 days
// across all properties for the operator

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db = getSupabaseAdmin();

  const { data: operator } = await db.from("operators").select("id").eq("email", email).single();
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const { data: properties } = await db
    .from("properties")
    .select("id, name, phone_number")
    .eq("operator_id", operator.id);

  if (!properties?.length) return NextResponse.json({ renewals: [] });

  const now    = new Date();
  const in90   = new Date(now.getTime() + 90 * 86_400_000).toISOString();

  const propIds = properties.map(p => p.id);
  const { data: units } = await db
    .from("units")
    .select("id, unit_name, unit_type, status, lease_end, monthly_rent, current_resident, property_id")
    .in("property_id", propIds)
    .eq("status", "occupied")
    .not("lease_end", "is", null)
    .gte("lease_end", now.toISOString().split("T")[0])
    .lte("lease_end", in90.split("T")[0])
    .order("lease_end", { ascending: true });

  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));

  const renewals = (units ?? []).map(u => {
    const leaseEnd = new Date(u.lease_end as string);
    const daysLeft = Math.ceil((leaseEnd.getTime() - now.getTime()) / 86_400_000);
    const urgency  = daysLeft <= 30 ? "critical" : daysLeft <= 60 ? "warning" : "upcoming";
    return {
      id:               u.id,
      unit_name:        u.unit_name,
      unit_type:        u.unit_type,
      lease_end:        u.lease_end,
      days_left:        daysLeft,
      monthly_rent:     u.monthly_rent,
      current_resident: u.current_resident,
      property_id:      u.property_id,
      property_name:    propMap[u.property_id as string]?.name ?? "Unknown",
      urgency,
    };
  });

  return NextResponse.json({ renewals });
}
