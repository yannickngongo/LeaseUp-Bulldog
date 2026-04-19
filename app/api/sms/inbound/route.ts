import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendSms } from "@/lib/twilio";

// POST /api/sms/inbound — Twilio webhook for incoming SMS
// Set this URL in your Twilio console: https://yourdomain.com/api/sms/inbound
export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const from = formData.get("From") as string; // lead's phone number
  const body = formData.get("Body") as string; // message text
  const sid = formData.get("MessageSid") as string;

  if (!from || !body) {
    return new NextResponse("Missing From or Body", { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Find the lead by phone number
  const { data: lead } = await db
    .from("leads")
    .select("id, name, status")
    .eq("phone", from)
    .single();

  if (!lead) {
    // Unknown number — you can choose to auto-create a lead here later
    console.warn("Inbound SMS from unknown number:", from);
    return new NextResponse("OK", { status: 200 });
  }

  // Log the inbound message
  await db.from("conversations").insert({
    lead_id: lead.id,
    direction: "inbound",
    channel: "sms",
    body,
    twilio_sid: sid,
  });

  // Update last_contacted_at
  await db
    .from("leads")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", lead.id);

  // Auto-reply to keep the conversation warm
  const reply = `Thanks for getting back to us, ${lead.name}! A leasing agent will follow up with you shortly. Want to schedule a tour? Just let us know your availability!`;

  await sendSms({ to: from, body: reply });

  await db.from("conversations").insert({
    lead_id: lead.id,
    direction: "outbound",
    channel: "sms",
    body: reply,
  });

  // Twilio expects a 200 response (TwiML not required when you send manually)
  return new NextResponse("OK", { status: 200 });
}
