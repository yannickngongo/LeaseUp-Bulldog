// POST /api/leads/apartments
// Receives lead inquiries from Apartments.com (CoStar Group) and other ILS platforms.
// Accepts both application/x-www-form-urlencoded and JSON.
//
// Setup: In your Apartments.com partner portal → Lead Delivery, set endpoint to:
//   https://leaseupbulldog.vercel.app/api/leads/apartments?property_id=<LUB_PROPERTY_ID>
//
// CoStar lead fields overlap heavily with Zillow's format.
// This endpoint also handles: Rent.com, Trulia (separate from Zillow), RentPath.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";

function parseDate(raw: string): string | undefined {
  if (!raw) return undefined;
  // YYYYMMDD format
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try JS date parse
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return undefined;
}

function bedsToUnit(n: string): number | null {
  const m: Record<string, number> = { "0": 0, studio: 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5 };
  return m[n?.trim()?.toLowerCase()] ?? null;
}

export async function POST(req: NextRequest) {
  const fields: Record<string, string> = {};
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    new URLSearchParams(text).forEach((v, k) => { fields[k] = v; });
  } else {
    try {
      const json = await req.json() as Record<string, unknown>;
      for (const [k, v] of Object.entries(json)) {
        if (v != null) fields[k] = String(v);
      }
    } catch {
      return NextResponse.json({ error: "Expected URL-encoded or JSON body" }, { status: 400 });
    }
  }

  const db = getSupabaseAdmin();
  const propertyId = req.nextUrl.searchParams.get("property_id");

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

  // Fallback: match by zip
  if (!property) {
    const zip = fields.listingPostalCode ?? fields.zip ?? fields.postal_code ?? "";
    if (zip) {
      const { data } = await db
        .from("properties")
        .select("id, name, phone_number, operator_id, active_special")
        .eq("zip", zip)
        .limit(1)
        .maybeSingle();
      property = data as PropertyRow | null;
    }
  }

  if (!property) {
    return NextResponse.json(
      { errorCode: "PROPERTY_NOT_FOUND", errorMessage: "Set ?property_id=<LUB_PROPERTY_ID> in your lead delivery URL." },
      { status: 400 }
    );
  }

  // Normalize fields — CoStar/Apartments.com field variants
  const fullName  = fields.name ?? fields.full_name ?? fields.firstName ?? "";
  const firstName = fields.firstName ?? fields.first_name ?? fullName.split(" ")[0] ?? "";
  const lastName  = fields.lastName  ?? fields.last_name  ?? fullName.split(" ").slice(1).join(" ");
  const name      = [firstName, lastName].filter(Boolean).join(" ") || fullName;
  const rawPhone  = fields.phone ?? fields.phone_number ?? fields.phoneNumber ?? "";
  const phone     = rawPhone.replace(/\D/g, "");
  const email     = fields.email ?? fields.emailAddress ?? "";
  const moveDate  = parseDate(fields.movingDate ?? fields.move_in_date ?? fields.moveInDate ?? "");
  const beds      = bedsToUnit(fields.numBedroomsSought ?? fields.bedrooms ?? fields.beds ?? "");
  const message   = (fields.message ?? fields.comments ?? "").trim();
  const source    = fields.source ?? "apartments";

  if (!firstName || phone.length < 10) {
    return NextResponse.json({ errorCode: "MISSING_FIELDS", errorMessage: "name and phone are required" }, { status: 422 });
  }

  const e164 = phone.startsWith("1") && phone.length === 11 ? `+${phone}` : `+1${phone}`;

  // Dedup
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

  const { data: lead, error: leadErr } = await db
    .from("leads")
    .insert({
      property_id:  property.id,
      name,
      phone:        e164,
      email:        email || null,
      status:       "new",
      source,
      move_in_date: moveDate ?? null,
      bedrooms:     beds,
    })
    .select("id, name, phone, status")
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ errorMessage: "received error status code 500" }, { status: 500 });
  }

  await db.from("activity_logs").insert({
    action:      "new_lead",
    actor:       "system",
    lead_id:     lead.id,
    property_id: property.id,
    metadata:    { lead_name: name, source, message: message.slice(0, 500) || null, property_name: property.name, operator_id: property.operator_id },
  });

  try {
    const result = await generateLeadReply({
      leadName:            firstName,
      propertyName:        property.name,
      activeSpecial:       property.active_special ?? undefined,
      trigger:             "new_lead",
      conversationHistory: message ? `Prospect said: "${message}"` : "",
    });

    const smsResult = await sendSms({ to: lead.phone, body: result.message, from: property.phone_number });

    await db.from("leads").update({ status: "contacted" }).eq("id", lead.id);
    await db.from("conversations").insert({
      lead_id: lead.id, property_id: property.id,
      direction: "outbound", channel: "sms",
      body: result.message, twilio_sid: smsResult.sid, ai_generated: true,
    });
    await db.from("activity_logs").insert({
      action: "sms_sent", actor: "ai",
      lead_id: lead.id, property_id: property.id,
      metadata: { lead_name: name, preview: result.message.slice(0, 80), operator_id: property.operator_id },
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
}
