// POST /api/setup — create operator + first property in one shot
// GET  /api/setup — check whether this user already has an operator record

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: operator } = await db
    .from("operators")
    .select("id, name, plan")
    .eq("email", email)
    .single();

  const { data: properties } = operator
    ? await db.from("properties").select("id, name, phone_number, address, city, state").eq("operator_id", operator.id)
    : { data: [] };

  return NextResponse.json({ operator: operator ?? null, properties: properties ?? [] });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { email, name } = body;
  if (!email || !name) return NextResponse.json({ error: "email and name required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { error } = await db.from("operators").update({ name }).eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { operatorName, email, propertyName, address, city, state, zip, phoneNumber, activeSpecial, websiteUrl, totalUnits, tourBookingUrl } = body;

  if (!operatorName || !email || !propertyName || !address || !city || !state || !zip || !phoneNumber) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Upsert operator by email
  let operatorId: string;
  const { data: existing } = await db.from("operators").select("id").eq("email", email).single();

  if (existing) {
    operatorId = existing.id;
    await db.from("operators").update({ name: operatorName }).eq("id", operatorId);
  } else {
    const { data: created, error } = await db
      .from("operators")
      .insert({ name: operatorName, email, plan: "starter" })
      .select("id")
      .single();
    if (error || !created) return NextResponse.json({ error: "Failed to create operator" }, { status: 500 });
    operatorId = created.id;
  }

  // Create property
  const { data: property, error: propError } = await db
    .from("properties")
    .insert({
      operator_id:    operatorId,
      name:           propertyName,
      address,
      city,
      state,
      zip,
      phone_number:      phoneNumber,
      active_special:    activeSpecial || null,
      website_url:       websiteUrl || null,
      total_units:       totalUnits ? parseInt(totalUnits, 10) : null,
      tour_booking_url:  tourBookingUrl || null,
    })
    .select("id, name, phone_number")
    .single();

  if (propError) {
    if (propError.code === "23505") {
      return NextResponse.json({ error: "That phone number is already registered to another property." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, operatorId, property }, { status: 201 });
}
