// POST /api/marketing-waitlist — add an email to the Marketing Add-on waitlist
// GET  /api/marketing-waitlist — return waitlist count (for social proof on landing page)
//
// Body for POST: { email, propertyCount?, notes?, source? }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const Schema = z.object({
  email:         z.string().email(),
  propertyCount: z.number().int().min(0).max(10000).optional(),
  notes:         z.string().max(1000).optional(),
  source:        z.enum(["marketing_tab", "billing_page", "pricing_page", "other"]).default("other"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }
  const { email, propertyCount, notes, source } = parsed.data;

  const db = getSupabaseAdmin();

  // Try to link to existing operator if one exists with that email
  const { data: operator } = await db
    .from("operators")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  const { error } = await db.from("marketing_waitlist").upsert(
    {
      email:          email.toLowerCase().trim(),
      operator_id:    operator?.id ?? null,
      property_count: propertyCount ?? null,
      notes:          notes ?? null,
      source,
    },
    { onConflict: "email" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort activity log
  try {
    await db.from("activity_logs").insert({
      lead_id:     "00000000-0000-0000-0000-000000000000",
      property_id: "00000000-0000-0000-0000-000000000000",
      action:      "marketing_waitlist_signup",
      actor:       "system",
      metadata:    { email, source, property_count: propertyCount ?? null },
    });
  } catch { /* non-blocking */ }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const db = getSupabaseAdmin();
  const { count } = await db
    .from("marketing_waitlist")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ count: count ?? 0 });
}
