// GET /api/notifications/badge — counts of operator action items that
// need attention right now. Used by the bell badge + dashboard banner.

import { NextRequest, NextResponse } from "next/server";
import { resolveCallerContext } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();

  // Operator's properties
  const { data: properties } = await db
    .from("properties")
    .select("id")
    .eq("operator_id", ctx.operatorId);
  const propertyIds = (properties ?? []).map((p) => p.id);

  if (propertyIds.length === 0) {
    return NextResponse.json({
      takeoversPending: 0,
      pendingLeads: [],
    });
  }

  // Leads under unresolved human takeover
  const { data: takeovers } = await db
    .from("leads")
    .select("id, name, last_contacted_at, property_id")
    .in("property_id", propertyIds)
    .eq("human_takeover", true)
    .order("last_contacted_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    takeoversPending: (takeovers ?? []).length,
    pendingLeads: (takeovers ?? []).map((l) => ({
      id:                 l.id,
      name:               l.name,
      property_id:        l.property_id,
      last_contacted_at:  l.last_contacted_at,
    })),
  });
}
