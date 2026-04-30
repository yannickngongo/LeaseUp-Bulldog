// GET /api/billing/status
// Returns the operator's current Marketing Add-on subscription status.
// Also reports if the operator is using a PRO_OVERRIDE_EMAILS bypass.

import { NextRequest, NextResponse } from "next/server";
import { resolveCallerContext } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasActiveMarketingSubscription } from "@/lib/stripe-server";

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const [opRes, subRes] = await Promise.all([
    db.from("operators")
      .select(`
        email,
        stripe_customer_id,
        stripe_subscription_id,
        marketing_subscription_status,
        marketing_subscribed_at,
        marketing_subscription_ends_at
      `)
      .eq("id", ctx.operatorId)
      .single(),
    db.from("billing_subscriptions")
      .select("marketing_addon, status")
      .eq("operator_id", ctx.operatorId)
      .maybeSingle(),
  ]);
  const op = opRes.data;

  if (!op) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const isPro     = !!op.email && (process.env.PRO_OVERRIDE_EMAILS ?? "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
    .includes(op.email.toLowerCase());

  // Canonical access check: only reads marketing_addon + PRO_OVERRIDE.
  const hasAccess = hasActiveMarketingSubscription({
    email:           op.email,
    marketing_addon: subRes.data?.marketing_addon,
  });

  // The Stripe subscription status (active/past_due/canceled/...) is informational
  // only — it tracks Stripe's view, not access. Access is solely driven by
  // marketing_addon. Webhook keeps both in sync for active subscriptions.
  return NextResponse.json({
    hasAccess,
    isPro,
    status:        op.marketing_subscription_status ?? (subRes.data?.marketing_addon ? "active" : "inactive"),
    subscribedAt:  op.marketing_subscribed_at  ?? null,
    endsAt:        op.marketing_subscription_ends_at ?? null,
    hasCustomer:   !!op.stripe_customer_id,
  });
}
