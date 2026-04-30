// POST /api/billing/portal
// Returns a Stripe Customer Portal URL where the operator can manage
// their subscription, update payment method, view invoices, or cancel.

import { NextRequest, NextResponse } from "next/server";
import { resolveCallerContext } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createBillingPortalSession } from "@/lib/stripe-server";

export async function POST(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data: op } = await db
    .from("operators")
    .select("stripe_customer_id")
    .eq("id", ctx.operatorId)
    .single();

  if (!op?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer — subscribe first" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  try {
    const url = await createBillingPortalSession(op.stripe_customer_id, `${baseUrl}/settings/billing`);
    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to open portal";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
