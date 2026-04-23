// POST /api/admin/enable-addon
// Sets plan and/or enables the marketing add-on for an operator by email.
// Protected by CRON_SECRET bearer token.
//
// Body: { email: string, plan?: string, marketing_addon?: boolean }
// Returns: { ok: true, log: string[] }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { email: rawEmail, plan, marketing_addon } = body as {
    email?: string;
    plan?: string;
    marketing_addon?: boolean;
  };
  const email = rawEmail?.trim();
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

  // Update plan on operators table if requested
  if (plan && plan !== operator.plan) {
    const { error } = await db.from("operators").update({ plan }).eq("id", operator.id);
    if (error) log.push(`ERROR updating plan: ${error.message}`);
    else        log.push(`Plan updated: ${operator.plan} → ${plan}`);
  } else if (plan) {
    log.push(`Plan already ${plan} — no change`);
  }

  // Upsert billing_subscriptions if marketing_addon requested
  if (marketing_addon !== undefined) {
    const effectivePlan = plan ?? operator.plan ?? "starter";
    const perfFeeMap: Record<string, number> = { starter: 20000, core: 20000, pro: 15000, growth: 15000, portfolio: 10000, enterprise: 10000 };

    const { error } = await db.from("billing_subscriptions").upsert(
      {
        operator_id:               operator.id,
        status:                    "active",
        marketing_addon,
        marketing_fee:             marketing_addon ? 20000 : 0,
        performance_fee_per_lease: perfFeeMap[effectivePlan] ?? 20000,
      },
      { onConflict: "operator_id" }
    );
    if (error) log.push(`ERROR upserting billing_subscriptions: ${error.message}`);
    else        log.push(`billing_subscriptions upserted (marketing_addon=${marketing_addon})`);
  }

  return NextResponse.json({ ok: true, log });
}
