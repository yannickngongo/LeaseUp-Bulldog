import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function ensureOperatorAndAcceptInvite(
  email: string,
  fullName: string | undefined,
  inviteToken: string
) {
  const db = getSupabaseAdmin();

  const { data: existingOp } = await db.from("operators").select("id").eq("email", email).single();
  if (!existingOp) {
    await db.from("operators").insert({
      name:  fullName ?? email.split("@")[0],
      email,
      plan:  "member",
    });
  }

  const { data: inv } = await db
    .from("organization_invitations")
    .select("id, email, role, property_ids, organization_id, expires_at")
    .eq("token", inviteToken)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (inv) {
    await db.from("organization_members").upsert({
      organization_id: inv.organization_id,
      email:           inv.email,
      role:            inv.role,
      property_ids:    inv.property_ids,
      status:          "active",
      accepted_at:     new Date().toISOString(),
    }, { onConflict: "organization_id,email" });
    await db.from("organization_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", inv.id);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code        = searchParams.get("code");
  const token_hash  = searchParams.get("token_hash");
  const type        = searchParams.get("type");
  const inviteToken = searchParams.get("invite_token") ?? "";

  const supabase = makeSupabase();

  // ── Email verification (magic link / email confirm) ───────────────────────
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "email" | "recovery" | "invite" | "magiclink" | "email_change",
    });

    if (error) {
      return NextResponse.redirect(`${origin}/login?error=verification_failed`);
    }

    if (inviteToken && data.user?.email) {
      await ensureOperatorAndAcceptInvite(
        data.user.email,
        data.user.user_metadata?.full_name,
        inviteToken
      );
    } else if (data.user?.email) {
      // Regular email verification — ensure operators row exists
      const db = getSupabaseAdmin();
      const { data: existingOp } = await db.from("operators").select("id").eq("email", data.user.email).single();
      if (!existingOp) {
        await db.from("operators").insert({
          name:  data.user.user_metadata?.full_name ?? data.user.email.split("@")[0],
          email: data.user.email,
          plan:  "starter",
        });
      }
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // ── OAuth code exchange (Google, etc.) ────────────────────────────────────
  if (code) {
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (inviteToken && data.session?.user?.email) {
      await ensureOperatorAndAcceptInvite(
        data.session.user.email,
        data.session.user.user_metadata?.full_name,
        inviteToken
      );
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
