// POST /api/tours — schedule a tour for a lead
// GET  /api/tours — list tours (filterable by ?propertyId or ?leadId)
//
// On POST: creates tour record, advances lead status to tour_scheduled,
// sends an SMS confirmation to the lead, logs activity.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendSms } from "@/lib/twilio";

const CreateTourSchema = z.object({
  lead_id:      z.string().uuid(),
  property_id:  z.string().uuid(),
  scheduled_at: z.string().datetime({ offset: true }).or(z.string().min(1)),
  notes:        z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = CreateTourSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { lead_id, property_id, scheduled_at, notes } = parsed.data;
  const db = getSupabaseAdmin();

  // Fetch lead + property for SMS
  const [{ data: lead }, { data: property }] = await Promise.all([
    db.from("leads").select("id, name, phone, opt_out").eq("id", lead_id).single(),
    db.from("properties").select("id, name, phone_number").eq("id", property_id).single(),
  ]);

  if (!lead)     return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  // Insert tour
  const { data: tour, error: tourError } = await db
    .from("tours")
    .insert({ lead_id, property_id, scheduled_at, status: "scheduled", notes })
    .select()
    .single();

  if (tourError) {
    console.error("Tour insert error:", tourError);
    return NextResponse.json({ error: tourError.message }, { status: 500 });
  }

  // Advance lead status to tour_scheduled
  await db.from("leads").update({ status: "tour_scheduled", updated_at: new Date().toISOString() }).eq("id", lead_id);

  // Send SMS confirmation if not opted out
  let smsSent = false;
  if (!lead.opt_out && lead.phone) {
    const dt = new Date(scheduled_at);
    const formatted = dt.toLocaleString("en-US", {
      weekday: "long", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    });
    const msg = `Hi ${lead.name.split(" ")[0]}! Your tour at ${property.name} is confirmed for ${formatted}. Reply STOP to unsubscribe.`;
    try {
      await sendSms({ to: lead.phone, from: property.phone_number, body: msg });
      smsSent = true;

      // Log the outbound SMS
      await db.from("conversations").insert({
        lead_id, property_id,
        direction: "outbound", channel: "sms",
        body: msg, ai_generated: false,
      });
    } catch (e) {
      console.error("Tour SMS error:", e);
    }
  }

  // Log activity
  await db.from("activity_logs").insert({
    lead_id, property_id,
    action: `Tour scheduled for ${new Date(scheduled_at).toLocaleDateString()}`,
    actor: "agent",
    metadata: { tour_id: tour.id, sms_sent: smsSent },
  });

  return NextResponse.json({ ok: true, tour, sms_sent: smsSent });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const leadId     = searchParams.get("leadId");

  const db = getSupabaseAdmin();
  let query = db.from("tours").select("*, leads(name, phone), properties(name)").order("scheduled_at", { ascending: true });

  if (propertyId) query = query.eq("property_id", propertyId);
  if (leadId)     query = query.eq("lead_id", leadId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tours: data ?? [] });
}
