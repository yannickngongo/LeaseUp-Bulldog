// POST /api/admin/enable-addon
// Enables the marketing add-on for an operator by email.
// Protected by CRON_SECRET bearer token.
//
// Body: { email: string }
// Returns: { ok: true, log: string[] }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email = (body as { email?: string }).email?.trim();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const log: string[] = [];

  // Look up operator
  const { data: operator, error: opErr } = await db
    .from("operators")
    .select("id, name, plan")
    .eq("email", email)
    .maybeSingle();

  if (opErr || !operator) {
    return NextResponse.json({ error: `Operator not found for ${email}` }, { status: 404 });
  }
  log.push(`Found operator: ${operator.name} (${operator.plan})`);

  // Upsert billing_subscriptions row with marketing_addon = true
  const { data: existing } = await db
    .from("billing_subscriptions")
    .select("id, marketing_addon")
    .eq("operator_id", operator.id)
    .maybeSingle();

  if (existing?.id) {
    if (existing.marketing_addon) {
      log.push("marketing_addon already enabled — no changes needed");
    } else {
      const { error } = await db
        .from("billing_subscriptions")
        .update({ marketing_addon: true, marketing_fee: 20000 })
        .eq("id", existing.id);
      if (error) log.push(`ERROR updating billing_subscriptions: ${error.message}`);
      else        log.push("marketing_addon enabled on existing billing row");
    }
  } else {
    // No billing_subscriptions row yet — create one
    const { error } = await db.from("billing_subscriptions").insert({
      operator_id:              operator.id,
      plan:                     operator.plan ?? "starter",
      status:                   "active",
      marketing_addon:          true,
      marketing_fee:            20000,
      performance_fee_per_lease: 20000,
    });
    if (error) log.push(`ERROR creating billing_subscriptions: ${error.message}`);
    else        log.push("Created billing_subscriptions row with marketing_addon = true");
  }

  return NextResponse.json({ ok: true, log });
}
