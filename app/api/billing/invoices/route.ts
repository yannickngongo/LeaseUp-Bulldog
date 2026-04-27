// GET /api/billing/invoices?email=... — returns last 12 Stripe invoices for the operator

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  // Dynamic import to avoid build-time issues
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getSupabaseAdmin();
    const { data: op } = await db
      .from("operators")
      .select("stripe_customer_id")
      .eq("email", ctx.email)
      .maybeSingle();

    if (!op?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] });
    }

    const stripe = getStripe();
    const list = await stripe.invoices.list({
      customer: op.stripe_customer_id,
      limit: 12,
    });

    const invoices = list.data.map((inv: {
      id: string;
      number: string | null;
      status: string | null;
      amount_paid: number;
      amount_due: number;
      currency: string;
      created: number;
      invoice_pdf: string | null;
      hosted_invoice_url: string | null;
      period_start: number;
      period_end: number;
    }) => ({
      id:          inv.id,
      number:      inv.number,
      status:      inv.status,
      amount_paid: inv.amount_paid,
      amount_due:  inv.amount_due,
      currency:    inv.currency,
      created:     inv.created,
      pdf_url:     inv.invoice_pdf,
      hosted_url:  inv.hosted_invoice_url,
      period_start: inv.period_start,
      period_end:   inv.period_end,
    }));

    return NextResponse.json({ invoices });
  } catch (err) {
    console.error("[billing/invoices]", err);
    return NextResponse.json({ invoices: [] });
  }
}
