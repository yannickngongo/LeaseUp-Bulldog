// GET  /api/properties/[id]/details — fetch single property
// PATCH /api/properties/[id]/details — update property fields

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("properties")
    .select("id, name, address, city, state, zip, neighborhood, phone_number, active_special, website_url, total_units, occupied_units, tour_booking_url, notify_email")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ property: data });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  const body = await req.json();

  const allowed = ["name", "address", "city", "state", "zip", "neighborhood", "phone_number", "active_special", "website_url", "total_units", "tour_booking_url", "notify_email"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (!update.name || !update.address || !update.city || !update.state || !update.zip || !update.phone_number) {
    return NextResponse.json({ error: "Name, address, city, state, ZIP, and phone are required." }, { status: 400 });
  }

  const { data, error } = await db
    .from("properties")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ property: data });
}
