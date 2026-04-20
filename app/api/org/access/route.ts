// PUT  /api/org/access — update property access for a member
// GET  /api/org/access?email=...&memberId=... — get property access for a specific member

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext, requirePermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const callerEmail = req.nextUrl.searchParams.get("email");
  const memberId    = req.nextUrl.searchParams.get("memberId");
  if (!callerEmail) return NextResponse.json({ error: "email required" }, { status: 400 });

  const ctx = await resolveCallerContext(callerEmail);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(ctx, "manage_users");
  if (denied) return denied;

  if (!ctx.organizationId) return NextResponse.json({ propertyIds: null });

  const db = getSupabaseAdmin();
  let query = db
    .from("user_property_access")
    .select("property_id, user_id")
    .eq("organization_id", ctx.organizationId);

  if (memberId) query = query.eq("user_id", memberId) as typeof query;

  const { data } = await query;
  return NextResponse.json({ access: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { email: callerEmail, memberId, propertyIds } = body;

  if (!callerEmail || !memberId || !Array.isArray(propertyIds)) {
    return NextResponse.json({ error: "email, memberId, and propertyIds[] required" }, { status: 400 });
  }

  const ctx = await resolveCallerContext(callerEmail);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(ctx, "manage_users");
  if (denied) return denied;

  if (!ctx.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Delete existing access records for this member
  await db
    .from("user_property_access")
    .delete()
    .eq("user_id", memberId)
    .eq("organization_id", ctx.organizationId);

  // Insert new access records
  if (propertyIds.length > 0) {
    const rows = propertyIds.map((pid: string) => ({
      organization_id: ctx.organizationId,
      user_id:         memberId,
      property_id:     pid,
      granted_by:      ctx.userId,
    }));

    const { error } = await db.from("user_property_access").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await db.from("activity_logs").insert({
    action:   "property_access_updated",
    actor:    "agent",
    metadata: {
      updated_by:   callerEmail,
      member_id:    memberId,
      property_ids: propertyIds,
      operator_id:  ctx.operatorId,
    },
  });

  return NextResponse.json({ ok: true });
}
