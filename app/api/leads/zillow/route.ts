// POST /api/leads/zillow
// Receives lead inquiries from Zillow Rentals (Zillow, Trulia, HotPads).
// Zillow POSTs application/x-www-form-urlencoded — NOT JSON.
//
// Setup: In Zillow Rental Manager → Lead Delivery API, set your endpoint to:
//   https://leaseupbulldog.vercel.app/api/leads/zillow?property_id=<LUB_PROPERTY_ID>
//
// Routing: property_id query param (required).
// Fallback: matches by listingPostalCode if property_id is omitted.
//
// Zillow retries on any non-2xx response, so we return descriptive 400s for bad data.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";

// ─── Field mapping ────────────────────────────────────────────────────────────

// Zillow sends movingDate as YYYYMMDD — convert to YYYY-MM-DD
function parseMovingDate(d: string): string | undefined {
  if (/^\d{8}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return undefined;
}

// numBedroomsSought integer → our unit_type enum
function bedroomsToUnitType(n: string): string | undefined {
  return ({ "0": "studio", "1": "1br", "2": "2br", "3": "3br", "4": "4br", "5": "5br" } as Record<string, string>)[n.trim()];
}

const UNIT_BEDROOMS: Record<string, number> = {
  studio: 0, "1br": 1, "2br": 2, "3br": 3, "4br": 4, "5br": 5,
};

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Parse URL-encoded body (Zillow's format)
  const fields: Record<string, string> = {};
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    new URLSearchParams(text).forEach((v, k) => { fields[k] = v; });
  } else {
    // Accept JSON too (for testing)
    try {
      const json = await req.json() as Record<string, unknown>;
      for (const [k, v] of Object.entries(json)) {
        if (typeof v === "string") fields[k] = v;
      }
    } catch {
      return NextResponse.json({ errorCode: "BAD_FORMAT", errorMessage: "Expected application/x-www-form-urlencoded" }, { status: 400 });
    }
  }

  const db = getSupabaseAdmin();
  const propertyId = req.nextUrl.searchParams.get("property_id");

  // ── Resolve property ────────────────────────────────────────────────────────
  type PropertyRow = { id: string; name: string; phone_number: string; operator_id: string; active_special: string | null };
  let property: PropertyRow | null = null;

  if (propertyId) {
    const { data } = await db
      .from("properties")
      .select("id, name, phone_number, operator_id, active_special")
      .eq("id", propertyId)
      .single();
    property = data as PropertyRow | null;
  }

  // Fallback: match by zip code (less reliable, but helpful for feed-level API config)
  if (!property && fields.listingPostalCode) {
    const { data } = await db
      .from("properties")
      .select("id, name, phone_number, operator_id, active_special")
      .eq("zip", fields.listingPostalCode)
      .limit(1)
      .maybeSingle();
    property = data as PropertyRow | null;
  }

  if (!property) {
    // Zillow reads this error and retries — be specific so it's debuggable
    return NextResponse.json(
      {
        errorCode: "PROPERTY_NOT_FOUND",
        errorMessage: `Could not identify property. listingId=${fields.listingId ?? "?"} zip=${fields.listingPostalCode ?? "?"}. Set ?property_id=<LUB_PROPERTY_ID> in your Zillow Lead Delivery URL.`,
      },
      { status: 400 }
    );
  }

  // ── Extract lead fields ─────────────────────────────────────────────────────
  const name      = (fields.name ?? "").trim();
  const firstName = name.split(/\s+/)[0] ?? "";
  const phone     = (fields.phone ?? "").replace(/\D/g, "");
  const email     = (fields.email ?? "").trim();
  const moveDate  = parseMovingDate(fields.movingDate ?? "");
  const unitType  = fields.numBedroomsSought ? bedroomsToUnitType(fields.numBedroomsSought) : undefined;
  const message   = (fields.message ?? "").trim();
  const leadType  = fields.leadType ?? "question"; // question | tourRequest | applicationRequest
  const listingId = fields.listingId ?? "";

  if (!firstName) {
    return NextResponse.json({ errorCode: "MISSING_NAME", errorMessage: "name field is required" }, { status: 422 });
  }
  if (phone.length < 10) {
    return NextResponse.json({ errorCode: "MISSING_PHONE", errorMessage: "valid phone number is required" }, { status: 422 });
  }

  const e164 = phone.startsWith("1") && phone.length === 11 ? `+${phone}` : `+1${phone}`;

  // ── Deduplicate: same phone + property within 30 days ──────────────────────
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: existing } = await db
    .from("leads")
    .select("id")
    .eq("property_id", property.id)
    .eq("phone", e164)
    .gte("created_at", cutoff)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, leadId: existing.id, duplicate: true });
  }

  // ── Insert lead ─────────────────────────────────────────────────────────────
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .insert({
      property_id:  property.id,
      name,
      phone:        e164,
      email:        email || null,
      status:       "new",
      source:       "zillow",
      move_in_date: moveDate ?? null,
      bedrooms:     unitType != null ? UNIT_BEDROOMS[unitType] : null,
    })
    .select("id, name, phone, status")
    .single();

  if (leadErr || !lead) {
    console.error("[POST /api/leads/zillow] lead insert error:", leadErr);
    return NextResponse.json({ errorMessage: "received error status code 500" }, { status: 500 });
  }

  // ── Log intake ──────────────────────────────────────────────────────────────
  await db.from("activity_logs").insert({
    action:      "new_lead",
    actor:       "system",
    lead_id:     lead.id,
    property_id: property.id,
    metadata: {
      lead_name:     name,
      source:        "zillow",
      lead_type:     leadType,
      zillow_listing_id: listingId,
      message:       message.slice(0, 500) || null,
      property_name: property.name,
      operator_id:   property.operator_id,
    },
  });

  // ── AI welcome SMS ──────────────────────────────────────────────────────────
  try {
    const isTourRequest = leadType === "tourRequest";
    const result = await generateLeadReply({
      leadName:            firstName,
      propertyName:        property.name,
      activeSpecial:       property.active_special ?? undefined,
      trigger:             "new_lead",
      conversationHistory: message ? `Prospect said: "${message}"` : "",
    });

    const smsResult = await sendSms({
      to:   lead.phone,
      body: result.message,
      from: property.phone_number,
    });

    await db.from("leads").update({ status: "contacted" }).eq("id", lead.id);
    await db.from("conversations").insert({
      lead_id:      lead.id,
      property_id:  property.id,
      direction:    "outbound",
      channel:      "sms",
      body:         result.message,
      twilio_sid:   smsResult.sid,
      ai_generated: true,
    });
    await db.from("activity_logs").insert({
      action:      "sms_sent",
      actor:       "ai",
      lead_id:     lead.id,
      property_id: property.id,
      metadata:    { lead_name: name, preview: result.message.slice(0, 80), operator_id: property.operator_id },
    });
  } catch {
    // Non-fatal — lead is saved, SMS failed silently
  }

  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
}
