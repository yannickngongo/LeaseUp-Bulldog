// POST /api/org/invite — invite a new team member by email
// GET  /api/org/invite?token=... — look up invitation details (for accept flow)
// DELETE /api/org/invite — cancel a pending invitation

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext, requirePermission } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: inv } = await db
    .from("organization_invitations")
    .select("id, email, role, property_ids, expires_at, organization_id, organizations(name, operator_id)")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!inv) return NextResponse.json({ error: "Invitation not found or expired" }, { status: 404 });

  // Fetch the operator's real name so the invite page can show it
  let inviterName = "";
  const operatorId = (inv.organizations as { operator_id?: string } | null)?.operator_id;
  if (operatorId) {
    const { data: op } = await db.from("operators").select("name").eq("id", operatorId).single();
    inviterName = op?.name ?? "";
  }

  return NextResponse.json({ invitation: { ...inv, inviter_name: inviterName } });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { inviteEmail, role = "viewer", propertyIds = [] } = body;

  if (!inviteEmail) {
    return NextResponse.json({ error: "inviteEmail required" }, { status: 400 });
  }

  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(ctx, "manage_users");
  if (denied) return denied;

  const db = getSupabaseAdmin();

  // Ensure organization exists — create it if this is the first team invite
  let orgId = ctx.organizationId;
  if (!orgId) {
    const { data: operatorRow } = await db
      .from("operators")
      .select("name")
      .eq("id", ctx.operatorId)
      .single();
    // Use operator name, but strip it if it looks like an email address
    const rawName = operatorRow?.name ?? "";
    const orgName = rawName.includes("@")
      ? rawName.split("@")[0]
      : (rawName || ctx.email.split("@")[0]);

    const { data: newOrg, error: orgErr } = await db
      .from("organizations")
      .insert({ name: orgName, operator_id: ctx.operatorId, plan: "starter" })
      .select("id")
      .single();

    if (orgErr || !newOrg) {
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
    }
    orgId = newOrg.id;

    // Add the owner as a member
    await db.from("organization_members").insert({
      organization_id: orgId,
      email:           ctx.email,
      role:            "owner",
      status:          "active",
      accepted_at:     new Date().toISOString(),
    });
  }

  // Check for existing active member
  const { data: existingMember } = await db
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", inviteEmail)
    .eq("status", "active")
    .single();

  if (existingMember) {
    return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  // Create invitation with an explicit token and expiry
  const token = randomUUID();
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error: invErr } = await db
    .from("organization_invitations")
    .insert({
      organization_id: orgId,
      email:           inviteEmail,
      role,
      property_ids:    propertyIds,
      token,
      expires_at,
    })
    .select("id, token, email, role, expires_at")
    .single();

  if (invErr || !invitation) {
    return NextResponse.json({ error: invErr?.message ?? "Failed to create invitation" }, { status: 500 });
  }

  await db.from("activity_logs").insert({
    action:   "member_invited",
    actor:    "agent",
    metadata: { invited_by: ctx.email, invite_email: inviteEmail, role, operator_id: ctx.operatorId },
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/accept-invite?token=${invitation.token}`;

  // Send invite email (best-effort — don't fail the request if email fails)
  try {
    const { data: org } = await db.from("organizations").select("name").eq("id", orgId).single();
    await sendInviteEmail({
      to:        inviteEmail,
      inviteUrl,
      orgName:   org?.name ?? "your team",
      role,
      invitedBy: ctx.email,
    });
  } catch (emailErr) {
    console.error("Failed to send invite email:", emailErr);
  }

  return NextResponse.json({ ok: true, invitation, inviteUrl }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { invitationId } = body;
  if (!invitationId) return NextResponse.json({ error: "invitationId required" }, { status: 400 });

  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const denied = requirePermission(ctx, "manage_users");
  if (denied) return denied;

  if (!ctx.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("organization_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("organization_id", ctx.organizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
