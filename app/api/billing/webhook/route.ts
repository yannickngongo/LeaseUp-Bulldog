// POST /api/billing/webhook
// Handles Stripe webhook events for the Marketing Add-on subscription:
//   - checkout.session.completed         → subscription created
//   - customer.subscription.updated      → status changes
//   - customer.subscription.deleted      → cancellation
//   - invoice.payment_succeeded          → log
//   - invoice.payment_failed             → mark past_due, pause campaigns

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  verifyWebhookSignature,
  findMeteredSubscriptionItem,
  getStripe,
} from "@/lib/stripe-server";
import { pauseMetaCampaign } from "@/lib/meta-ads";

export async function POST(req: NextRequest) {
  const rawBody   = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook signature failed: ${msg}` }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.customer || !session.subscription) break;

        const customerId     = typeof session.customer === "string" ? session.customer : session.customer.id;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;

        const meteredItemId = await findMeteredSubscriptionItem(subscriptionId);

        await db.from("operators").update({
          stripe_subscription_id:              subscriptionId,
          stripe_subscription_item_metered_id: meteredItemId,
          marketing_subscription_status:       "active",
          marketing_subscribed_at:             new Date().toISOString(),
          marketing_subscription_ends_at:      null,
        }).eq("stripe_customer_id", customerId);

        // Sync legacy billing_subscriptions.marketing_addon flag (sidebar badge + draft gate)
        const { data: opForLegacy } = await db
          .from("operators").select("id").eq("stripe_customer_id", customerId).single();
        if (opForLegacy?.id) {
          await db.from("billing_subscriptions").upsert(
            { operator_id: opForLegacy.id, marketing_addon: true, marketing_fee: 50000, status: "active" },
            { onConflict: "operator_id" }
          );
        }

        await db.from("activity_logs").insert({
          lead_id:     "00000000-0000-0000-0000-000000000000",
          property_id: "00000000-0000-0000-0000-000000000000",
          action:      "marketing_subscription_started",
          actor:       "system",
          metadata:    { customer_id: customerId, subscription_id: subscriptionId },
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        // Map Stripe status to our enum
        const statusMap: Record<string, string> = {
          active:             "active",
          trialing:           "trialing",
          past_due:           "past_due",
          unpaid:             "past_due",
          canceled:           "canceled",
          incomplete:         "inactive",
          incomplete_expired: "inactive",
          paused:             "inactive",
        };
        const localStatus = statusMap[sub.status] ?? "inactive";

        const meteredItemId = await findMeteredSubscriptionItem(sub.id);
        const subAny = sub as unknown as { cancel_at?: number | null; current_period_end?: number };
        const endsAt = subAny.cancel_at ? new Date(subAny.cancel_at * 1000).toISOString() : null;

        await db.from("operators").update({
          stripe_subscription_id:              sub.id,
          stripe_subscription_item_metered_id: meteredItemId,
          marketing_subscription_status:       localStatus,
          marketing_subscription_ends_at:      endsAt,
        }).eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        await db.from("operators").update({
          marketing_subscription_status:  "canceled",
          marketing_subscription_ends_at: new Date().toISOString(),
        }).eq("stripe_customer_id", customerId);

        // Sync legacy flag — turn marketing_addon off
        const { data: opForLegacy } = await db
          .from("operators").select("id").eq("stripe_customer_id", customerId).single();
        if (opForLegacy?.id) {
          await db.from("billing_subscriptions").update({ marketing_addon: false })
            .eq("operator_id", opForLegacy.id);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        await db.from("activity_logs").insert({
          lead_id:     "00000000-0000-0000-0000-000000000000",
          property_id: "00000000-0000-0000-0000-000000000000",
          action:      "marketing_invoice_paid",
          actor:       "system",
          metadata:    {
            customer_id: customerId,
            invoice_id:  invoice.id,
            amount_paid: invoice.amount_paid,
            currency:    invoice.currency,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        // Mark subscription past_due
        await db.from("operators").update({
          marketing_subscription_status: "past_due",
        }).eq("stripe_customer_id", customerId);

        // Pause all active Meta campaigns for this operator
        const { data: op } = await db
          .from("operators")
          .select("id, meta_access_token, meta_ad_account_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (op?.meta_access_token && op?.meta_ad_account_id) {
          const { data: campaigns } = await db
            .from("campaigns")
            .select("id, meta_campaign_id")
            .eq("operator_id", op.id)
            .eq("status", "active")
            .not("meta_campaign_id", "is", null);

          const stripe = getStripe();
          for (const c of campaigns ?? []) {
            if (!c.meta_campaign_id) continue;
            try {
              await pauseMetaCampaign(op.meta_ad_account_id, c.meta_campaign_id, op.meta_access_token);
              await db.from("campaigns").update({ status: "paused" }).eq("id", c.id);
            } catch (err) {
              console.error(`Failed to pause campaign ${c.id}:`, err);
            }
          }
          // suppress unused warning
          void stripe;
        }

        await db.from("activity_logs").insert({
          lead_id:     "00000000-0000-0000-0000-000000000000",
          property_id: "00000000-0000-0000-0000-000000000000",
          action:      "marketing_invoice_failed",
          actor:       "system",
          metadata:    { customer_id: customerId, invoice_id: invoice.id },
        });
        break;
      }
    }
  } catch (err) {
    console.error(`Stripe webhook handler error (${event.type}):`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
