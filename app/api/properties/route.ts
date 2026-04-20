// GET /api/properties?email=... — list properties for an operator
// Respects org membership + property access restrictions.
// Owners/admins see all properties; restricted members see only their assigned ones.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext, filterAllowedProperties } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db  = getSupabaseAdmin();
  const ctx = await resolveCallerContext(email);

  if (!ctx) {
    return NextResponse.json({ properties: [] });
  }

  const { data: properties } = await db
    .from("properties")
    .select("id, name, phone_number, address, city, state, zip, active_special, website_url")
    .eq("operator_id", ctx.operatorId)
    .order("created_at", { ascending: true });

  const all = properties ?? [];

  // Filter to allowed properties for restricted members
  const allowed = ctx.allowedPropertyIds === null
    ? all
    : all.filter(p => filterAllowedProperties(ctx, [p.id]).length > 0);

  return NextResponse.json({ properties: allowed });
}
