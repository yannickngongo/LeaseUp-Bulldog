// POST /api/campaigns/payment-intent
// Creates a Stripe PaymentIntent for the campaign ad spend.
// The client then confirms the payment with Stripe.js, then calls /launch.
//
// Required env vars:
//   STRIPE_SECRET_KEY

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { resolveCallerContext } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const Schema = z.object({
  campaignId:  z.string().uuid(),
  amountCents: z.number().int().min(100),  // minimum $1
  platform:    z.enum(["facebook", "instagram", "google"]),
});

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { campaignId, amountCents, platform } = parsed.data;

  // Verify campaign belongs to this operator
  const db = getSupabaseAdmin();
  const { data: campaign } = await db
    .from("campaigns")
    .select("id, property_id, properties(name, operator_id)")
    .eq("id", campaignId)
    .single();

  const prop = campaign?.properties as unknown as { name: string; operator_id: string } | null;
  if (!campaign || prop?.operator_id !== ctx.operatorId) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    amount:   amountCents,
    currency: "usd",
    metadata: {
      campaign_id:  campaignId,
      operator_id:  ctx.operatorId,
      operator_email: ctx.email,
      platform,
      property_name: prop?.name ?? "",
    },
    description: `LeaseUp Bulldog — ${platform} ad campaign for ${prop?.name ?? campaignId}`,
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
