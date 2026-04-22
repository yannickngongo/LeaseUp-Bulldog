// POST /api/checkout/webhook
// Stripe webhook handler. Verifies signature, then processes events.
//
// Events handled:
//   checkout.session.completed — activate operator plan after payment

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

const PLAN_MAP: Record<string, string> = {
  core:           "starter",
  core_marketing: "growth",
  portfolio:      "enterprise",
};

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { operator_id, operator_email, plan } = session.metadata ?? {};

    if (!plan) {
      return NextResponse.json({ ok: true });
    }

    const db = getSupabaseAdmin();
    const dbPlan = PLAN_MAP[plan] ?? "starter";
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    if (operator_id) {
      await db
        .from("operators")
        .update({
          plan:                dbPlan,
          stripe_customer_id:  session.customer as string,
          stripe_payment_intent: session.payment_intent as string,
          trial_ends_at:       trialEndsAt,
          activated_at:        new Date().toISOString(),
        })
        .eq("id", operator_id);
    } else if (operator_email) {
      await db
        .from("operators")
        .update({
          plan:                dbPlan,
          stripe_customer_id:  session.customer as string,
          stripe_payment_intent: session.payment_intent as string,
          trial_ends_at:       trialEndsAt,
          activated_at:        new Date().toISOString(),
        })
        .eq("email", operator_email);
    }
  }

  return NextResponse.json({ ok: true });
}
