import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";
import { sendSms } from "@/lib/twilio";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/sms/outbound — send a manual SMS to a lead from the dashboard
export async function POST(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 10 manual SMS per operator per minute to prevent blast abuse
  if (!rateLimit(`sms:${ctx.operatorId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  // Secondary per-IP guard
  const ip = getClientIp(req);
  if (!rateLimit(`sms-ip:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { lead_id, message } = await req.json();

  if (!lead_id || !message) {
    return NextResponse.json(
      { error: "lead_id and message are required" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  const { data: lead, error: leadError } = await db
    .from("leads")
    .select("id, name, phone, property_id")
    .eq("id", lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Use the property's dedicated Twilio number as the sender
  const { data: property } = await db
    .from("properties")
    .select("phone_number")
    .eq("id", lead.property_id)
    .single();

  // Persist the message first so it survives regardless of Twilio outcome
  const { data: savedMsg } = await db
    .from("conversations")
    .insert({
      lead_id:     lead.id,
      property_id: lead.property_id,
      direction:   "outbound",
      channel:     "sms",
      body:        message,
    })
    .select("id")
    .single();

  await db
    .from("leads")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", lead.id);

  // Now attempt to send via Twilio
  try {
    const twilioMessage = await sendSms({
      to:   lead.phone,
      body: message,
      from: property?.phone_number ?? undefined,
    });

    // Stamp the SID on the saved record
    if (savedMsg) {
      await db
        .from("conversations")
        .update({ twilio_sid: twilioMessage.sid })
        .eq("id", savedMsg.id);
    }

    return NextResponse.json({ success: true, sid: twilioMessage.sid });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sms/outbound] send failed:", msg);
    // Message is already in DB — return error so UI can mark it failed
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
