// POST /api/stripe/webhook
// Receives Stripe events and keeps operator subscription status in sync.
//
// Add to Vercel env vars:
//   STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard → Webhooks → your endpoint)
//
// Events handled:
//   checkout.session.completed        → activate subscription
//   customer.subscription.updated     → sync status (active / past_due / trialing)
//   customer.subscription.deleted     → mark cancelled
//   invoice.payment_failed            → mark past_due

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

async function syncSubscription(sub: Stripe.Subscription) {
  const db = getSupabaseAdmin();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const status = sub.status === "active" || sub.status === "trialing" ? "active"
    : sub.status === "past_due" ? "past_due"
    : "cancelled";

  await db
    .from("operators")
    .update({
      subscription_status:    status,
      stripe_subscription_id: sub.id,
      activated_at:           status === "active" ? new Date().toISOString() : undefined,
    })
    .eq("stripe_customer_id", customerId);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return new NextResponse("Webhook signature invalid", { status: 400 });
  }

  const db = getSupabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) break;
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      await syncSubscription(sub);
      // Mark onboarding complete if not already set
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (customerId) {
        await db.from("operators")
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq("stripe_customer_id", customerId)
          .is("onboarding_completed_at", null);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    }

    case "invoice.payment_failed": {
      const invoice    = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await db.from("operators")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
