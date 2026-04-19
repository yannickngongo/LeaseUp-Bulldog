import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendSms } from "@/lib/twilio";

// POST /api/sms/outbound — send a manual SMS to a lead from the dashboard
export async function POST(req: NextRequest) {
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
    .select("id, name, phone")
    .eq("id", lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const twilioMessage = await sendSms({ to: lead.phone, body: message });

  await db.from("conversations").insert({
    lead_id: lead.id,
    direction: "outbound",
    channel: "sms",
    body: message,
    twilio_sid: twilioMessage.sid,
  });

  await db
    .from("leads")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", lead.id);

  return NextResponse.json({ success: true, sid: twilioMessage.sid });
}
