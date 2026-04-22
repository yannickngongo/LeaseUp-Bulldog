// POST /api/checkout/create-session
// Creates a Stripe Checkout Session and returns { url } to redirect the client.
//
// Body: { plan: "core" | "core_marketing", email: string }

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

const PLANS: Record<string, { name: string; monthlyAmount: number; description: string }> = {
  core: {
    name: "Core Platform",
    monthlyAmount: 100000, // $1,000/mo in cents
    description: "AI lead qualification · Full dashboard · Unlimited leads · $200/lease performance fee",
  },
  core_marketing: {
    name: "Core + Marketing",
    monthlyAmount: 300000, // $3,000/mo in cents
    description: "Everything in Core + AI ad campaigns (Facebook & Google) · $200/lease performance fee",
  },
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { plan, email } = body as { plan?: string; email?: string };

  if (!plan || !email) {
    return NextResponse.json({ error: "plan and email required" }, { status: 400 });
  }

  const planConfig = PLANS[plan];
  if (!planConfig) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const stripe = getStripe();

  // Look up or create a Stripe customer for this operator
  const db = getSupabaseAdmin();
  const { data: operator } = await db
    .from("operators")
    .select("id, stripe_customer_id")
    .eq("email", email)
    .single();

  let customerId: string | undefined;
  if (operator?.stripe_customer_id) {
    customerId = operator.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email,
      metadata: { operator_id: operator?.id ?? "" },
    });
    customerId = customer.id;
    if (operator?.id) {
      await db
        .from("operators")
        .update({ stripe_customer_id: customer.id })
        .eq("id", operator.id);
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `LeaseUp Bulldog — ${planConfig.name} Setup`,
            description: `14-day pilot · ${planConfig.description}`,
          },
          unit_amount: 100000, // $1,000 setup fee
        },
        quantity: 1,
      },
    ],
    metadata: {
      plan,
      operator_id: operator?.id ?? "",
      operator_email: email,
    },
    customer_email: customerId ? undefined : email,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?cancelled=1`,
  });

  return NextResponse.json({ url: session.url });
}
