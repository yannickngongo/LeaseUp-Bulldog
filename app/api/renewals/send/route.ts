// POST /api/renewals/send — AI generates + sends a lease renewal offer SMS to a tenant

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendSms } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  const { unit_id, tenant_name, unit_name, property_name, lease_end, monthly_rent, phone, renewal_offer } = await req.json() as {
    unit_id: string;
    tenant_name: string;
    unit_name: string;
    property_name: string;
    lease_end: string;
    monthly_rent: number | null;
    phone: string;
    renewal_offer?: string;
  };

  if (!unit_id || !phone) {
    return NextResponse.json({ error: "unit_id and phone required" }, { status: 400 });
  }

  const client = new Anthropic();

  const leaseEndFormatted = new Date(lease_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const daysLeft = Math.ceil((new Date(lease_end).getTime() - Date.now()) / 86_400_000);

  const prompt = `You are a friendly property manager at ${property_name}. Write a concise, warm SMS to a tenant about renewing their lease.

Tenant: ${tenant_name || "Resident"}
Unit: ${unit_name}
Lease expires: ${leaseEndFormatted} (${daysLeft} days away)
Current rent: ${monthly_rent ? `$${monthly_rent}/mo` : "on file"}
${renewal_offer ? `Renewal offer: ${renewal_offer}` : "Offer: same rent, 12-month renewal"}

Write a friendly 2-3 sentence SMS. Be warm, personal, and make it easy for them to respond. End with a clear call to action (reply YES to renew, or call to discuss). Keep it under 160 characters if possible, 320 max. No emojis needed. Return ONLY the SMS text, nothing else.`;

  let message: string;
  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages:   [{ role: "user", content: prompt }],
    });
    message = (response.content[0] as { type: string; text: string }).text.trim().replace(/^["']|["']$/g, "");
  } catch {
    message = `Hi ${tenant_name || "there"}! Your lease at ${property_name} (${unit_name}) expires ${leaseEndFormatted}. We'd love to have you renew — reply YES and we'll send renewal papers, or call us to discuss options.`;
  }

  // Send SMS if phone provided and looks valid
  let smsSid: string | null = null;
  if (phone && phone.replace(/\D/g, "").length >= 10) {
    try {
      const sms = await sendSms({ to: phone, body: message });
      smsSid = sms.sid;
    } catch (err) {
      console.error("SMS send failed:", err);
    }
  }

  // Record in DB
  const db = getSupabaseAdmin();
  await db.from("activity_logs").insert({
    action:   "renewal_offer_sent",
    actor:    "agent",
    metadata: { unit_id, unit_name, property_name, tenant_name, sms_sid: smsSid, message },
  });

  return NextResponse.json({ ok: true, message, sms_sid: smsSid });
}
