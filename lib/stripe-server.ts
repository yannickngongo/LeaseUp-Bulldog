// Stripe server-side helpers for the Marketing Add-on subscription.
//
// Pricing model:
//   - $500/mo flat subscription          → Stripe Price (recurring, licensed)
//   - 5% of actual ad spend (billed monthly) → Stripe Price (recurring, metered)
//
// Both prices live on the same Subscription so the operator gets one invoice/month.
//
// Required env vars:
//   STRIPE_SECRET_KEY                    — Stripe API key
//   STRIPE_WEBHOOK_SECRET                — for verifying webhook signatures
//   STRIPE_PRICE_MARKETING_FLAT          — Price ID of the $500/mo flat fee
//   STRIPE_PRICE_AD_SPEND_METERED        — Price ID of the metered ad spend fee
//   NEXT_PUBLIC_APP_URL                  — used as base for Checkout return URLs
//   PRO_OVERRIDE_EMAILS                  — comma-separated list of emails that bypass billing (testing only)

import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  return _stripe;
}

const PRO_OVERRIDE_EMAILS = (process.env.PRO_OVERRIDE_EMAILS ?? "")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

// ─── hasActiveMarketingSubscription ──────────────────────────────────────────
// Returns true if any of these are true:
//   1. Email is in PRO_OVERRIDE_EMAILS (testing bypass)
//   2. operators.marketing_subscription_status is active/trialing (new Stripe sub)
//   3. billing_subscriptions.marketing_addon is true (legacy system)

export function hasActiveMarketingSubscription(op: {
  email?:                          string | null;
  marketing_subscription_status?:  string | null;
  marketing_addon?:                boolean | null;   // from billing_subscriptions (legacy)
}): boolean {
  if (op.email && PRO_OVERRIDE_EMAILS.includes(op.email.toLowerCase())) return true;
  if (op.marketing_subscription_status === "active" || op.marketing_subscription_status === "trialing") return true;
  if (op.marketing_addon === true) return true;
  return false;
}

// ─── checkMarketingAccessByOperatorId ────────────────────────────────────────
// Server-side helper that joins operators + billing_subscriptions and runs
// hasActiveMarketingSubscription. Use this in API routes to gate features.

export async function checkMarketingAccessByOperatorId(operatorId: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const [opRes, subRes] = await Promise.all([
    db.from("operators").select("email, marketing_subscription_status").eq("id", operatorId).single(),
    db.from("billing_subscriptions").select("marketing_addon").eq("operator_id", operatorId).maybeSingle(),
  ]);
  return hasActiveMarketingSubscription({
    email:                         opRes.data?.email,
    marketing_subscription_status: opRes.data?.marketing_subscription_status,
    marketing_addon:               subRes.data?.marketing_addon,
  });
}

// ─── getOrCreateStripeCustomer ───────────────────────────────────────────────
// Returns the operator's Stripe Customer ID. Creates one if missing.

export async function getOrCreateStripeCustomer(
  operatorId: string,
  email: string
): Promise<string> {
  const db = getSupabaseAdmin();
  const { data: op } = await db
    .from("operators")
    .select("stripe_customer_id")
    .eq("id", operatorId)
    .single();

  if (op?.stripe_customer_id) return op.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { operator_id: operatorId },
  });

  await db.from("operators")
    .update({ stripe_customer_id: customer.id })
    .eq("id", operatorId);

  return customer.id;
}

// ─── createMarketingCheckoutSession ──────────────────────────────────────────
// Stripe Checkout for the dual-line subscription: $500 flat + 5% metered.

export async function createMarketingCheckoutSession(
  customerId:  string,
  successUrl:  string,
  cancelUrl:   string
): Promise<{ url: string; id: string }> {
  const flatPrice    = process.env.STRIPE_PRICE_MARKETING_FLAT;
  const meteredPrice = process.env.STRIPE_PRICE_AD_SPEND_METERED;

  if (!flatPrice)    throw new Error("Missing STRIPE_PRICE_MARKETING_FLAT");
  if (!meteredPrice) throw new Error("Missing STRIPE_PRICE_AD_SPEND_METERED");

  const stripe  = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode:           "subscription",
    customer:       customerId,
    line_items: [
      { price: flatPrice,    quantity: 1 },
      { price: meteredPrice }, // metered — no quantity at subscribe time
    ],
    success_url:           successUrl,
    cancel_url:            cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  if (!session.url) throw new Error("Stripe Checkout did not return a URL");
  return { url: session.url, id: session.id };
}

// ─── createBillingPortalSession ──────────────────────────────────────────────

export async function createBillingPortalSession(
  customerId: string,
  returnUrl:  string
): Promise<string> {
  const stripe  = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: returnUrl,
  });
  return session.url;
}

// ─── reportAdSpendUsage ──────────────────────────────────────────────────────
// Reports a delta of ad spend (in dollars) to the metered subscription item.
// Stripe price is configured at $0.05 per unit, where unit = $1 of ad spend.

export async function reportAdSpendUsage(
  meteredItemId: string,
  dollarsSpent:  number,
  timestampSec:  number = Math.floor(Date.now() / 1000)
): Promise<{ id: string }> {
  if (dollarsSpent <= 0) throw new Error("dollarsSpent must be > 0");

  const stripe = getStripe();
  // Stripe SDK v17+ moved usage records under sub_items but kept the legacy method.
  // Cast to legacy shape because TS types lag behind for metered billing.
  const usage = await (stripe.subscriptionItems as unknown as {
    createUsageRecord: (
      itemId: string,
      params: { quantity: number; timestamp: number; action: "increment" | "set" }
    ) => Promise<{ id: string }>;
  }).createUsageRecord(meteredItemId, {
    quantity:  Math.max(0, Math.round(dollarsSpent)),
    timestamp: timestampSec,
    action:    "increment",
  });
  return { id: usage.id };
}

// ─── findMeteredSubscriptionItem ─────────────────────────────────────────────
// Given a subscription, returns the ID of the metered line item (the 5% one).

export async function findMeteredSubscriptionItem(
  subscriptionId: string
): Promise<string | null> {
  const stripe       = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  for (const item of subscription.items.data) {
    const recurring = (item.price as Stripe.Price).recurring;
    if (recurring?.usage_type === "metered") return item.id;
  }
  return null;
}

// ─── verifyWebhookSignature ──────────────────────────────────────────────────

export function verifyWebhookSignature(
  rawBody:   string,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
