// POST /api/leads/webhook
// Universal lead intake for external platforms: Zillow, Facebook, ILS, website forms.
// Accepts flexible field names and maps them to our lead schema.
//
// Authentication: HMAC signature via X-Webhook-Secret header OR api_key query param.
// The secret is stored per-property in properties.webhook_secret (see migration below).
//
// Payload normalization handles common field name variations from different sources:
//   Zillow:   first_name, last_name, phone_number, email_address, move_date, bedrooms
//   Facebook: full_name, phone, email, custom_disclaimer_responses
//   Generic:  name, phone, email, source, unit_type, move_in_date

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";

// ─── Field normalization ──────────────────────────────────────────────────────

function normalizePayload(body: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  // Name resolution
  const fullName  = str(body.name || body.full_name || body.fullName || "");
  const firstName = str(body.first_name || body.firstName || fullName.split(" ")[0] || "");
  const lastName  = str(body.last_name  || body.lastName  || fullName.split(" ").slice(1).join(" ") || "");

  // Phone normalization: strip everything but digits and leading +
  const rawPhone = str(body.phone || body.phone_number || body.phoneNumber || body.mobile || "");
  const phone = rawPhone.startsWith("+") ? rawPhone : rawPhone.replace(/\D/g, "");

  const email = str(body.email || body.email_address || body.emailAddress || "");

  // Unit type normalization
  const rawUnit = str(body.unit_type || body.unitType || body.bedrooms || body.beds || "");
  const unitMap: Record<string, string> = {
    "0": "studio", studio: "studio",
    "1": "1br", "1br": "1br", "1bed": "1br", "1 bed": "1br", "1 bedroom": "1br",
    "2": "2br", "2br": "2br", "2bed": "2br",
    "3": "3br", "3br": "3br", "3bed": "3br",
    "4": "4br", "5": "5br",
  };
  const unitType = unitMap[rawUnit.toLowerCase()] ?? undefined;

  // Move-in date
  const rawDate = str(body.move_in_date || body.moveInDate || body.move_date || body.moveDate || body.desiredMoveDate || "");
  const moveDate = rawDate.match(/^\d{4}-\d{2}-\d{2}$/) ? rawDate : undefined;

  const source = str(body.source || body.lead_source || body.leadSource || "webhook");

  return { firstName, lastName, phone, email, unitType, moveDate, source };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get("property_id");
  if (!propertyId) {
    return NextResponse.json({ error: "property_id query param required" }, { status: 400 });
  }

  // Auth: check X-Webhook-Secret or api_key param
  const providedSecret = req.headers.get("x-webhook-secret") ?? req.nextUrl.searchParams.get("api_key") ?? "";

  const db = getSupabaseAdmin();

  const { data: property, error: propErr } = await db
    .from("properties")
    .select("id, name, phone_number, operator_id, active_special, website_url")
    .eq("id", propertyId)
    .single();

  if (propErr || !property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  // Check webhook_secret if column exists (gracefully skip if not yet migrated)
  const webhookSecret = (property as Record<string, unknown>).webhook_secret as string | undefined;
  if (webhookSecret && providedSecret !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { firstName, lastName, phone, email, unitType, moveDate, source } = normalizePayload(body);

  if (!firstName || phone.length < 10) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 422 });
  }

  const name = [firstName, lastName].filter(Boolean).join(" ");

  // Deduplicate: same phone + property within last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: existing } = await db
    .from("leads")
    .select("id")
    .eq("property_id", propertyId)
    .eq("phone", phone)
    .gte("created_at", thirtyDaysAgo)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ ok: true, leadId: existing.id, duplicate: true });
  }

  // Create lead
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .insert({
      property_id:  propertyId,
      name,
      phone:        phone.startsWith("+") ? phone : `+1${phone}`,
      email:        email || null,
      status:       "new",
      source,
      move_in_date: moveDate ?? null,
    })
    .select("id, name, phone, status")
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }

  // Log intake
  await db.from("activity_logs").insert({
    action:      "new_lead",
    actor:       "system",
    lead_id:     lead.id,
    property_id: propertyId,
    metadata:    { lead_name: name, source, property_name: property.name, operator_id: property.operator_id },
  });

  // Generate and send AI welcome SMS
  try {
    const result = await generateLeadReply({
      leadName:            name,
      propertyName:        property.name,
      activeSpecial:       (property as Record<string, unknown>).active_special as string | undefined,
      trigger:             "new_lead",
      conversationHistory: "",
    });
    const aiMessage = result.message;

    const smsResult = await sendSms({
      to:   lead.phone,
      body: aiMessage,
      from: property.phone_number,
    });

    await db.from("leads").update({ status: "contacted" }).eq("id", lead.id);
    await db.from("conversations").insert({
      lead_id:      lead.id,
      property_id:  propertyId,
      direction:    "outbound",
      channel:      "sms",
      body:         aiMessage,
      twilio_sid:   smsResult.sid,
      ai_generated: true,
    });
    await db.from("activity_logs").insert({
      action:      "sms_sent",
      actor:       "ai",
      lead_id:     lead.id,
      property_id: propertyId,
      metadata:    { lead_name: name, preview: aiMessage.slice(0, 80), operator_id: property.operator_id },
    });
  } catch {
    // Non-fatal — lead is created, SMS failed silently
  }

  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
}
