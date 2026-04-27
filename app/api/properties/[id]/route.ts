// DELETE /api/properties/[id] — delete a property and its related data

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { releasePhoneNumber } from "@/lib/twilio";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  // Fetch the property's Twilio SID before deleting so we can release the number
  const { data: property } = await db
    .from("properties")
    .select("twilio_number_sid")
    .eq("id", id)
    .single();

  // Delete child records first
  await db.from("units").delete().eq("property_id", id);
  await db.from("ad_variations").delete().in(
    "campaign_id",
    (await db.from("campaigns").select("id").eq("property_id", id)).data?.map(c => c.id) ?? []
  );
  await db.from("campaigns").delete().eq("property_id", id);
  await db.from("leads").delete().eq("property_id", id);

  const { error } = await db.from("properties").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Release the Twilio number so billing stops
  if (property?.twilio_number_sid) {
    await releasePhoneNumber(property.twilio_number_sid);
  }

  return NextResponse.json({ ok: true });
}
