// POST /api/setup — create operator + first property in one shot
// GET  /api/setup — check whether this user already has an operator record

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { provisionPhoneNumber, sendSms, normalizePhone } from "@/lib/twilio";
import { resolveCallerContext } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { recordMilestone } from "@/lib/milestones";

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = ctx.email;

  const db = getSupabaseAdmin();
  const { data: operator } = await db
    .from("operators")
    .select("id, name, plan, subscription_status, trial_ends_at, activated_at, stripe_customer_id, stripe_subscription_id")
    .eq("email", email)
    .single();

  const [propertiesResult, subResult] = await Promise.all([
    operator
      ? db.from("properties").select("id, name, phone_number, address, city, state").eq("operator_id", operator.id)
      : Promise.resolve({ data: [] }),
    operator
      ? db.from("billing_subscriptions").select("marketing_addon, marketing_fee, performance_fee_per_lease").eq("operator_id", operator.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const enrichedOperator = operator
    ? { ...operator, marketing_addon: subResult.data?.marketing_addon ?? false }
    : null;

  return NextResponse.json({ operator: enrichedOperator, properties: propertiesResult.data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { error } = await db.from("operators").update({ name }).eq("email", ctx.email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit — this endpoint provisions paid Twilio numbers, so abuse is expensive.
  // 5 setups/hour per operator, 10/hour per IP.
  if (!rateLimit(`setup:${ctx.operatorId}`, 5, 3_600_000)) {
    return NextResponse.json({ error: "Too many setup attempts — try again in an hour" }, { status: 429 });
  }
  if (!rateLimit(`setup-ip:${getClientIp(req)}`, 10, 3_600_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const {
    operatorName, propertyName, address, city, state, zip,
    neighborhood, activeSpecial, websiteUrl, totalUnits, tourBookingUrl,
  } = body;
  const email = ctx.email;

  if (!operatorName || !propertyName || !address || !city || !state || !zip) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // UTM attribution captured on first visit (if available)
  const attr = body.attribution as
    | { utm_source?: string; utm_medium?: string; utm_campaign?: string; referrer?: string }
    | undefined;

  // Upsert operator by email
  let operatorId: string;
  const { data: existing } = await db.from("operators").select("id").eq("email", email).single();

  if (existing) {
    operatorId = existing.id;
    await db.from("operators").update({ name: operatorName }).eq("id", operatorId);
  } else {
    const { data: created, error } = await db
      .from("operators")
      .insert({
        name:                 operatorName,
        email,
        plan:                 "starter",
        signup_utm_source:    attr?.utm_source   ?? null,
        signup_utm_medium:    attr?.utm_medium   ?? null,
        signup_utm_campaign:  attr?.utm_campaign ?? null,
        signup_referrer:      attr?.referrer     ?? null,
      })
      .select("id")
      .single();
    if (error || !created) return NextResponse.json({ error: "Failed to create operator" }, { status: 500 });
    operatorId = created.id;
  }

  // Auto-provision a local number in the same city as the property
  const provisioned = await provisionPhoneNumber({ city, state });

  if (!provisioned) {
    return NextResponse.json(
      { error: "Could not provision a phone number. Please try again or contact support." },
      { status: 503 }
    );
  }

  // Create property
  const { data: property, error: propError } = await db
    .from("properties")
    .insert({
      operator_id:       operatorId,
      name:              propertyName,
      address,
      city,
      state,
      zip,
      neighborhood:      neighborhood || null,
      phone_number:      provisioned.phoneNumber,
      twilio_number_sid: provisioned.sid,
      active_special:    activeSpecial || null,
      website_url:       websiteUrl || null,
      total_units:       totalUnits ? parseInt(totalUnits, 10) : null,
      tour_booking_url:  tourBookingUrl || null,
    })
    .select("id, name, phone_number")
    .single();

  if (propError) {
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }

  // ── Record milestone: setup_complete (first time only) ───────────────────────
  await recordMilestone(operatorId, "setup_complete", {
    property_id:    property?.id,
    property_name:  propertyName,
    city, state,
  });

  // ── Send welcome SMS to the operator ─────────────────────────────────────────
  // We don't have an operator phone yet (operators table doesn't store one),
  // so we skip if the body didn't include one. Wire-in path: when /setup
  // collects a contact phone, pass it here as `body.contactPhone`.
  const contactPhone = (body.contactPhone || body.operatorPhone || body.phone) as string | undefined;
  if (contactPhone) {
    const normalized = normalizePhone(contactPhone);
    if (normalized) {
      // Dedupe — only ever send once per operator
      const { data: alreadySent } = await db
        .from("operators")
        .select("welcome_sms_sent_at")
        .eq("id", operatorId)
        .maybeSingle();

      if (!alreadySent?.welcome_sms_sent_at) {
        try {
          await sendSms({
            to:   normalized,
            from: provisioned.phoneNumber,
            body: `Welcome to LeaseUp Bulldog! Your AI is now live for ${propertyName}. Try texting this number to see how leads will be greeted within 60 seconds — that's how fast every prospect will hear from you.`,
          });
          await db.from("operators")
            .update({ welcome_sms_sent_at: new Date().toISOString() })
            .eq("id", operatorId);
        } catch (err) {
          console.error("[setup] welcome SMS failed (non-fatal):", err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, operatorId, property }, { status: 201 });
}
