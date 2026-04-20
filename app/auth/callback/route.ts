import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code        = searchParams.get("code");
  const inviteToken = searchParams.get("invite_token") ?? "";

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // If joining via invite, accept it and ensure operators row exists
    if (inviteToken && data.session?.user?.email) {
      const db    = getSupabaseAdmin();
      const email = data.session.user.email;

      const { data: existingOp } = await db.from("operators").select("id").eq("email", email).single();
      if (!existingOp) {
        await db.from("operators").insert({
          name:  data.session.user.user_metadata?.full_name ?? email.split("@")[0],
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
        await db.from("organization_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
