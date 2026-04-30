// POST /api/checkout/webhook
// Stripe webhook handler. Verifies signature, then processes events.
//
// Events handled:
//   checkout.session.completed — activate operator plan after payment

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { provisionAdAccounts } from "@/lib/ad-accounts";
import { normalizePlan } from "@/lib/plans";
import { seenWebhook } from "@/lib/webhook-idempotency";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

// Maps Stripe checkout plan IDs → canonical plan slugs
const PLAN_MAP: Record<string, string> = {
  starter:        "starter",
  pro:            "pro",
  portfolio:      "portfolio",
  // legacy slugs kept for backwards compat
  core:           "starter",
  core_marketing: "starter",
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

  // Idempotency — Stripe retries deliveries on timeout, so dedupe by event ID.
  const dup = await seenWebhook("stripe", event.id, event.type, event as unknown as Record<string, unknown>);
  if (dup) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { operator_id, operator_email, plan } = session.metadata ?? {};

    if (!plan) {
      return NextResponse.json({ ok: true });
    }

    const db = getSupabaseAdmin();
    const dbPlan = normalizePlan(PLAN_MAP[plan] ?? plan);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // Resolve operator record
    let resolvedId: string | null = operator_id ?? null;

    if (resolvedId) {
      await db
        .from("operators")
        .update({
          plan:                    dbPlan,
          stripe_customer_id:      session.customer as string,
          stripe_subscription_id:  session.subscription as string ?? null,
          trial_ends_at:           trialEndsAt,
          activated_at:            new Date().toISOString(),
        })
        .eq("id", resolvedId);
    } else if (operator_email) {
      const { data: op } = await db
        .from("operators")
        .update({
          plan:                    dbPlan,
          stripe_customer_id:      session.customer as string,
          stripe_subscription_id:  session.subscription as string ?? null,
          trial_ends_at:           trialEndsAt,
          activated_at:            new Date().toISOString(),
        })
        .eq("email", operator_email)
        .select("id, name")
        .single();

      resolvedId = op?.id ?? null;
    }

    if (resolvedId) {
      const hasMarketing = session.metadata?.marketing_addon === "1" || plan === "core_marketing";

      // Upsert billing_subscriptions record
      await db
        .from("billing_subscriptions")
        .upsert(
          {
            operator_id:     resolvedId,
            stripe_subscription_id: session.subscription as string ?? null,
            marketing_addon: hasMarketing,
            marketing_fee:   hasMarketing ? 50000 : 0,
            performance_fee_per_lease: (() => {
              if (dbPlan === "portfolio") return 10000; // $100
              if (dbPlan === "pro")       return 15000; // $150
              return 20000;                             // $200 starter
            })(),
            status: "trialing",
          },
          { onConflict: "operator_id" }
        );

      // Auto-provision Meta + Google ad sub-accounts for marketing operators
      if (hasMarketing) {
        const { data: op } = await db
          .from("operators")
          .select("name")
          .eq("id", resolvedId)
          .single();

        provisionAdAccounts(resolvedId, op?.name ?? "Unknown Operator").catch(err =>
          console.error("[checkout/webhook] ad account provisioning failed:", err)
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
