// POST /api/stripe/checkout
// Creates a Stripe Checkout session for the LUB Pro subscription.
// On success, Stripe redirects to /billing?success=true
// On cancel,  Stripe redirects to /billing

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lease-up-bulldog.vercel.app";

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
    .select("id, name, stripe_customer_id")
    .eq("email", user.email)
    .single();

  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  // Get or create Stripe customer
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

  // Create Checkout session (subscription mode with 14-day trial)
  const session = await stripe.checkout.sessions.create({
    customer:             customerId,
    mode:                 "subscription",
    line_items:           [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    subscription_data:    { trial_period_days: 14 },
    success_url:          `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:           `${appUrl}/billing?cancelled=true`,
    allow_promotion_codes: true,
    metadata:             { operator_id: operator.id },
  });

  return NextResponse.json({ url: session.url });
}
