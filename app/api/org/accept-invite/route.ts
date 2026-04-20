// POST /api/org/accept-invite
// Marks an invitation as accepted and adds the user as an active org member.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Look up the invitation
  const { data: inv } = await db
    .from("organization_invitations")
    .select("id, email, role, property_ids, organization_id, expires_at")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!inv) return NextResponse.json({ error: "Invitation not found or expired" }, { status: 404 });

  // Add as active member (upsert in case they were previously removed)
  const { error: memberErr } = await db
    .from("organization_members")
    .upsert({
      organization_id: inv.organization_id,
      email:           inv.email,
      role:            inv.role,
      property_ids:    inv.property_ids,
      status:          "active",
      accepted_at:     new Date().toISOString(),
    }, { onConflict: "organization_id,email" });

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  // Mark invitation accepted
  await db
    .from("organization_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inv.id);

  return NextResponse.json({ ok: true });
}
