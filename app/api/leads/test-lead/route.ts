// POST /api/leads/test-lead
// Creates a fake test lead for the operator's first property so they can
// see the AI response in action. Used by the empty-state CTA on /leads
// for new operators who haven't received a real lead yet.
//
// Body: { phone: string }   // operator's own phone number — they receive the AI text
//
// Tenant-scoped via JWT.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCallerContext } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/twilio";

const Schema = z.object({
  phone: z.string().min(7, "Phone number required"),
});

export async function POST(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit — 3 test leads per hour per operator (this triggers a real SMS, costs money)
  if (!rateLimit(`test-lead:${ctx.operatorId}`, 3, 3_600_000)) {
    return NextResponse.json({ error: "Too many test leads — try again in an hour" }, { status: 429 });
  }
  if (!rateLimit(`test-lead-ip:${getClientIp(req)}`, 10, 3_600_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Invalid phone number" }, { status: 422 });

  const db = getSupabaseAdmin();

  // Find the operator's first property (test lead goes to whichever they set up first)
  const { data: property } = await db
    .from("properties")
    .select("id, name, phone_number")
    .eq("operator_id", ctx.operatorId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!property) {
    return NextResponse.json({
      error:    "Add a property first so we know where to route the test lead",
      next_url: "/properties/new",
    }, { status: 412 });
  }

  // Forward to the universal lead webhook with a clear "test" source. The webhook
  // handler does the rest — creates the lead, fires AI welcome SMS, queues
  // follow-ups. Same exact path as a real Zillow/Apartments.com lead.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const webhookUrl = `${baseUrl}/api/leads/webhook?property_id=${property.id}`;

  try {
    const r = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:         "Test Lead (you)",
        phone:        phone,
        email:        ctx.email,
        source:       "test",
        message:      "Hi, I saw your listing online. Is this still available?",
      }),
    });
    const json = await r.json();
    if (!r.ok) {
      return NextResponse.json({ error: json.error ?? "Test lead failed" }, { status: 500 });
    }
    return NextResponse.json({
      ok:           true,
      lead_id:      json.lead_id,
      property_id:  property.id,
      property_name: property.name,
      hint:         `Watch for an SMS from ${property.phone_number} — that's your AI in action.`,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Network error",
    }, { status: 500 });
  }
}
