// POST /api/billing/subscribe
// Creates a Stripe Checkout session for the Marketing Add-on subscription
// ($500/mo flat + 5% metered ad spend) and returns the URL for redirect.

import { NextRequest, NextResponse } from "next/server";
import { resolveCallerContext } from "@/lib/auth";
import { createMarketingCheckoutSession, getOrCreateStripeCustomer } from "@/lib/stripe-server";

export async function POST(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  try {
    const customerId = await getOrCreateStripeCustomer(ctx.operatorId, ctx.email);
    const session    = await createMarketingCheckoutSession(
      customerId,
      `${baseUrl}/settings/billing?success=true`,
      `${baseUrl}/settings/billing?canceled=true`
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
