// GET /api/properties?email=... — list properties for an operator
// Respects org membership + property access restrictions.
// Owners/admins see all properties; restricted members see only their assigned ones.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext, filterAllowedProperties } from "@/lib/auth";
import { canAddProperty, getPlanConfig, getPlanLabel } from "@/lib/plans";

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
    .select("id, name, phone_number, address, city, state, zip, neighborhood, active_special, website_url, total_units, occupied_units, tour_booking_url")
    .eq("operator_id", ctx.operatorId)
    .order("created_at", { ascending: true });

  const all = properties ?? [];

  // Filter to allowed properties for restricted members
  const allowed = ctx.allowedPropertyIds === null
    ? all
    : all.filter(p => filterAllowedProperties(ctx, [p.id]).length > 0);

  return NextResponse.json({ properties: allowed });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email } = body as { email?: string };
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db  = getSupabaseAdmin();
  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Enforce plan property limit
  const { data: operator } = await db
    .from("operators")
    .select("plan")
    .eq("id", ctx.operatorId)
    .single();

  const plan = operator?.plan ?? "starter";
  const { count } = await db
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("operator_id", ctx.operatorId);

  const currentCount = count ?? 0;

  if (!canAddProperty(plan, currentCount)) {
    const config = getPlanConfig(plan);
    return NextResponse.json(
      {
        error: `Property limit reached`,
        detail: `Your ${getPlanLabel(plan)} plan includes up to ${config.maxProperties} propert${config.maxProperties === 1 ? "y" : "ies"}. Upgrade to add more.`,
        limit: config.maxProperties,
        current: currentCount,
      },
      { status: 403 }
    );
  }

  // Delegate actual creation to /api/setup (existing logic)
  // This POST handler enforces the limit; the setup route handles DB writes.
  return NextResponse.json({ ok: true, canCreate: true });
}
