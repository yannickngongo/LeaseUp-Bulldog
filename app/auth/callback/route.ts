import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendWelcomeEmail } from "@/lib/email";

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

  // Build a response we can attach cookies to (default — may be overridden below)
  let res = NextResponse.redirect(`${origin}/dashboard`);
  let isNewOperator = false;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── Email verification (magic link / email confirm) ───────────────────────
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "email" | "recovery" | "invite" | "magiclink" | "email_change",
    });

    if (error) {
      return NextResponse.redirect(`${origin}/login?error=verification_failed`);
    }

    // Password recovery — send to reset page, not dashboard
    if (type === "recovery") {
      res = NextResponse.redirect(`${origin}/reset-password`);
      return res;
    }

    if (inviteToken && data.user?.email) {
      await ensureOperatorAndAcceptInvite(
        data.user.email,
        data.user.user_metadata?.full_name,
        inviteToken
      );
    } else if (data.user?.email) {
      const db = getSupabaseAdmin();
      const { data: existingOp } = await db.from("operators").select("id").eq("email", data.user.email).single();
      if (!existingOp) {
        const fullName = data.user.user_metadata?.full_name as string | undefined;
        await db.from("operators").insert({
          name:  fullName ?? data.user.email.split("@")[0],
          email: data.user.email,
          plan:  "starter",
        });
        const firstName = fullName?.split(" ")[0] ?? data.user.email.split("@")[0];
        sendWelcomeEmail({ to: data.user.email, firstName }).catch(() => {});
        isNewOperator = true;
      }
    }

    if (isNewOperator) {
      res = NextResponse.redirect(`${origin}/onboarding`);
    }
    return res;
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
    } else if (data.session?.user?.email) {
      const db = getSupabaseAdmin();
      const email = data.session.user.email;
      const { data: existingOp } = await db.from("operators").select("id").eq("email", email).single();
      if (!existingOp) {
        const fullName = data.session.user.user_metadata?.full_name as string | undefined;
        await db.from("operators").insert({
          name:  fullName ?? email.split("@")[0],
          email,
          plan:  "starter",
        });
        const firstName = fullName?.split(" ")[0] ?? email.split("@")[0];
        sendWelcomeEmail({ to: email, firstName }).catch(() => {});
        isNewOperator = true;
      }
    }
  }

  if (isNewOperator && !inviteToken) {
    res = NextResponse.redirect(`${origin}/onboarding`);
  }
  return res;
}
