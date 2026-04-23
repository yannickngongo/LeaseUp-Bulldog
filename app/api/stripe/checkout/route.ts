// POST /api/stripe/checkout
// Two paths:
//   1. Active subscriber upgrading → updates existing subscription with proration
//      (charges only the difference for the rest of the billing period)
//   2. New subscriber / trial → creates a Stripe Checkout session
//
// Returns: { url } for new checkout, { upgraded: true } for in-place upgrade

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

// Plan rank used to prevent downgrade via this endpoint (downgrades go through portal)
const PLAN_RANK: Record<string, number> = {
  starter: 1, core: 1,
  pro: 2, growth: 2,
  portfolio: 3, enterprise: 3,
};

export async function POST(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lease-up-bulldog.vercel.app";
  const body = await req.json().catch(() => ({}));
  const plan = (body as { plan?: string }).plan ?? "core";
  const priceId = STRIPE_PRICE_IDS[plan];
  if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  // Get authenticated user
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data: operator } = await db
    .from("operators")
    .select("id, name, stripe_customer_id, stripe_subscription_id, subscription_status, plan")
    .eq("email", user.email)
    .single();

  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  // ── Path 1: active subscriber upgrading ──────────────────────────────────
  const isActive = operator.subscription_status === "active";
  const subId    = operator.stripe_subscription_id as string | null;
  const currentPlan = (operator.plan as string) ?? "starter";
  const isUpgrade = (PLAN_RANK[plan] ?? 0) > (PLAN_RANK[currentPlan] ?? 0);

  if (isActive && subId && isUpgrade) {
    // Retrieve the subscription to get the current item ID
    const subscription = await stripe.subscriptions.retrieve(subId, {
      expand: ["items"],
    });
    const currentItem = subscription.items.data[0];

    if (!currentItem) {
      return NextResponse.json({ error: "No subscription item found" }, { status: 500 });
    }

    // Update subscription in place — Stripe will:
    // 1. Credit the unused portion of the old plan for this period
    // 2. Charge the prorated amount for the new plan for this period
    // 3. Bill the new full price each period going forward
    await stripe.subscriptions.update(subId, {
      items: [{ id: currentItem.id, price: priceId }],
      proration_behavior: "create_prorations",
    });

    // Sync plan and performance fee to our DB immediately
    const perfFeeMap: Record<string, number> = { starter: 20000, core: 20000, pro: 15000, growth: 15000, portfolio: 10000, enterprise: 10000 };
    await db.from("operators").update({ plan }).eq("id", operator.id);
    await db.from("billing_subscriptions")
      .update({ plan, performance_fee_per_lease: perfFeeMap[plan] ?? 20000 })
      .eq("operator_id", operator.id);

    return NextResponse.json({ upgraded: true });
  }

  // ── Path 2: new subscriber or trial → Checkout session ───────────────────
  let customerId = operator.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email:    user.email,
      name:     operator.name,
      metadata: { operator_id: operator.id },
    });
    customerId = customer.id;
    await db.from("operators").update({ stripe_customer_id: customerId }).eq("id", operator.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer:             customerId,
    mode:                 "subscription",
    line_items:           [{ price: priceId, quantity: 1 }],
    subscription_data:    { trial_period_days: 14 },
    success_url:          `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:           `${appUrl}/billing?cancelled=true`,
    allow_promotion_codes: true,
    metadata:             { operator_id: operator.id },
  });

  return NextResponse.json({ url: session.url });
}
