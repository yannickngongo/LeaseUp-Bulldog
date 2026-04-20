// GET  /api/org/members?email=...  — list all members of the caller's organization
// POST /api/org/members            — update member role or status
// DELETE /api/org/members          — deactivate a member

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext, requirePermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(ctx, "manage_users");
  if (denied) return denied;

  const db = getSupabaseAdmin();

  if (!ctx.organizationId) {
    // Single-operator: return just the owner
    return NextResponse.json({
      members: [{ email: ctx.email, role: "owner", status: "active", property_ids: null }],
    });
  }

  const { data: members } = await db
    .from("organization_members")
    .select("id, email, role, status, invited_at, accepted_at")
    .eq("organization_id", ctx.organizationId)
    .order("invited_at", { ascending: true });

  // Also fetch pending invitations
  const { data: invitations } = await db
    .from("organization_invitations")
    .select("id, email, role, property_ids, created_at, expires_at, accepted_at")
    .eq("organization_id", ctx.organizationId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  return NextResponse.json({ members: members ?? [], invitations: invitations ?? [] });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { email: callerEmail, memberId, role, status } = body;
  if (!callerEmail || !memberId) return NextResponse.json({ error: "email and memberId required" }, { status: 400 });

  const ctx = await resolveCallerContext(callerEmail);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(ctx, "manage_users");
  if (denied) return denied;

  if (!ctx.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const db = getSupabaseAdmin();
  const updates: Record<string, unknown> = {};
  if (role)   updates.role   = role;
  if (status) updates.status = status;

  const { error } = await db
    .from("organization_members")
    .update(updates)
    .eq("id", memberId)
    .eq("organization_id", ctx.organizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("activity_logs").insert({
    action:   "member_updated",
    actor:    "agent",
    metadata: { changed_by: callerEmail, member_id: memberId, updates, operator_id: ctx.operatorId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { email: callerEmail, memberId } = body;
  if (!callerEmail || !memberId) return NextResponse.json({ error: "email and memberId required" }, { status: 400 });

  const ctx = await resolveCallerContext(callerEmail);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(ctx, "manage_users");
  if (denied) return denied;

  if (!ctx.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("organization_members")
    .update({ status: "deactivated" })
    .eq("id", memberId)
    .eq("organization_id", ctx.organizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("activity_logs").insert({
    action:   "member_deactivated",
    actor:    "agent",
    metadata: { deactivated_by: callerEmail, member_id: memberId, operator_id: ctx.operatorId },
  });

  return NextResponse.json({ ok: true });
}
