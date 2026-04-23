// POST /api/checkout/create-session
// Creates a Stripe Checkout Session (subscription + 14-day trial) and returns { url }.
//
// Body: { plan: "starter" | "pro" | "portfolio", marketing_addon: boolean, email: string }

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  STRIPE_PRICE_ID_STARTER,
  STRIPE_PRICE_ID_PRO,
  STRIPE_PRICE_ID_PORTFOLIO,
  STRIPE_PRICE_ID_MARKETING_ADDON,
} from "@/lib/stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

interface PlanConfig {
  name: string;
  unitAmount: number;
  priceId: string;
}

const PLAN_CONFIG: Record<string, PlanConfig> = {
  starter:   { name: "Starter",   unitAmount: 50000,  priceId: STRIPE_PRICE_ID_STARTER },
  pro:       { name: "Pro",       unitAmount: 150000, priceId: STRIPE_PRICE_ID_PRO },
  portfolio: { name: "Portfolio", unitAmount: 300000, priceId: STRIPE_PRICE_ID_PORTFOLIO },
};

function makePriceItem(priceId: string, name: string, unitAmount: number) {
  if (priceId) {
    return { price: priceId, quantity: 1 };
  }
  return {
    price_data: {
      currency: "usd" as const,
      product_data: { name: `LeaseUp Bulldog — ${name}` },
      unit_amount: unitAmount,
      recurring: { interval: "month" as const },
    },
    quantity: 1,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, marketing_addon, email } = body as {
      plan?: string;
      marketing_addon?: boolean;
      email?: string;
    };

    if (!plan || !email) {
      return NextResponse.json({ error: "plan and email required" }, { status: 400 });
    }

    const planConfig = PLAN_CONFIG[plan];
    if (!planConfig) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
      (() => {
        const host = req.headers.get("host") ?? "";
        const proto = host.startsWith("localhost") ? "http" : "https";
        return host ? `${proto}://${host}` : "https://lease-up-bulldog.vercel.app";
      })();
    const stripe = getStripe();
    const db = getSupabaseAdmin();

    // Look up existing operator record (may not exist for brand-new customers)
    const { data: operator } = await db
      .from("operators")
      .select("id, stripe_customer_id")
      .eq("email", email)
      .maybeSingle();

    // Look up or create Stripe customer
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

    const lineItems = [
      makePriceItem(planConfig.priceId, planConfig.name, planConfig.unitAmount),
    ];

    if (marketing_addon) {
      lineItems.push(
        makePriceItem(
          STRIPE_PRICE_ID_MARKETING_ADDON,
          "Marketing Add-On (Facebook & Google Ads)",
          50000,
        )
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      subscription_data: {
        trial_period_days: 14,
      },
      metadata: {
        plan,
        marketing_addon: marketing_addon ? "1" : "0",
        operator_id: operator?.id ?? "",
        operator_email: email,
      },
      customer_email: customerId ? undefined : email,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[create-session]", err);
    const message = err instanceof Error ? err.message : "Checkout session creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
