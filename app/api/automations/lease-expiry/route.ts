// POST /api/automations/lease-expiry
// Runs daily. Finds units whose lease_end has passed and marks them vacant.
// Also marks units as "notice" when lease_end is within 30 days.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db  = getSupabaseAdmin();
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const in30Days = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];

  let expired = 0;
  let upcoming = 0;

  // Units whose lease has already ended → mark vacant
  const { data: expiredUnits, error: expErr } = await db
    .from("units")
    .select("id, property_id, unit_name, lease_end")
    .eq("status", "occupied")
    .lt("lease_end", today)
    .not("lease_end", "is", null)
    .neq("lease_end", "");

  if (!expErr && expiredUnits?.length) {
    for (const unit of expiredUnits) {
      await db.from("units").update({
        status:           "vacant",
        current_resident: null,
      }).eq("id", unit.id);

      // Recalculate property occupancy
      const { data: allUnits } = await db.from("units").select("status").eq("property_id", unit.property_id);
      const total    = allUnits?.length ?? 0;
      const occupied = (allUnits ?? []).filter(u => u.status === "occupied" || u.status === "notice").length;
      await db.from("properties").update({ occupied_units: occupied, total_units: total }).eq("id", unit.property_id);

      expired++;
    }
  }

  // Units with lease ending in the next 30 days → mark notice (if still occupied)
  const { data: upcomingUnits, error: upErr } = await db
    .from("units")
    .select("id")
    .eq("status", "occupied")
    .gte("lease_end", today)
    .lte("lease_end", in30Days)
    .not("lease_end", "is", null)
    .neq("lease_end", "");

  if (!upErr && upcomingUnits?.length) {
    for (const unit of upcomingUnits) {
      await db.from("units").update({ status: "notice" }).eq("id", unit.id);
      upcoming++;
    }
  }

  return NextResponse.json({ ok: true, expired, upcoming });
}
