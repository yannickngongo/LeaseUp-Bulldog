// GET  /api/leads/facebook — Facebook webhook verification (hub challenge)
// POST /api/leads/facebook — Facebook Lead Ads lead delivery
//
// Setup in Meta Business Suite → Leads Access Manager → Lead Delivery Webhooks:
//   Callback URL:  https://leaseupbulldog.vercel.app/api/leads/facebook?property_id=<ID>
//   Verify Token:  value of FACEBOOK_VERIFY_TOKEN env var
//
// Facebook sends a JSON body with the leadgen_id. We fetch the full lead data
// from the Graph API using the operator's Page Access Token (stored in DB).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN ?? "leaseup_bulldog_fb_verify";

// ─── GET: webhook verification ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const mode      = req.nextUrl.searchParams.get("hub.mode");
  const token     = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Verification failed", { status: 403 });
}

// ─── POST: lead event ─────────────────────────────────────────────────────────

interface FbLeadField { name: string; values: string[] }
interface FbLeadData  { id: string; field_data: FbLeadField[]; created_time: number }

async function fetchLeadFromFacebook(leadgenId: string, accessToken: string): Promise<FbLeadData | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${leadgenId}?fields=id,field_data,created_time&access_token=${accessToken}`
    );
    if (!res.ok) return null;
    return await res.json() as FbLeadData;
  } catch {
    return null;
  }
}

function fieldValue(data: FbLeadData, ...names: string[]): string {
  for (const name of names) {
    const f = data.field_data.find(f => names.includes(f.name));
    if (f?.values?.[0]) return f.values[0];
    const exact = data.field_data.find(f => f.name === name);
    if (exact?.values?.[0]) return exact.values[0];
  }
  return "";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Facebook sends entries for each page event
  const entry = (body as Record<string, unknown>)?.entry;
  if (!Array.isArray(entry) || entry.length === 0) {
    return NextResponse.json({ ok: true }); // Acknowledge non-lead events
  }

  const db = getSupabaseAdmin();
  const propertyId = req.nextUrl.searchParams.get("property_id");

  for (const e of entry as Record<string, unknown>[]) {
    const changes = e.changes as Record<string, unknown>[] | undefined;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if ((change.field as string) !== "leadgen") continue;
      const value = change.value as Record<string, unknown>;
      const leadgenId = value?.leadgen_id as string;
      if (!leadgenId) continue;

      // Resolve property
      type PropertyRow = { id: string; name: string; phone_number: string; operator_id: string; active_special: string | null; facebook_access_token: string | null };
      let property: PropertyRow | null = null;

      if (propertyId) {
        const { data } = await db
          .from("properties")
          .select("id, name, phone_number, operator_id, active_special, facebook_access_token")
          .eq("id", propertyId)
          .single();
        property = data as PropertyRow | null;
      }

      if (!property || !property.facebook_access_token) {
        console.warn(`[FB webhook] No property or access token for leadgen_id=${leadgenId}`);
        continue;
      }

      // Fetch full lead from Graph API
      const leadData = await fetchLeadFromFacebook(leadgenId, property.facebook_access_token);
      if (!leadData) {
        console.warn(`[FB webhook] Could not fetch lead ${leadgenId}`);
        continue;
      }

      const fullName  = fieldValue(leadData, "full_name", "name");
      const firstName = fieldValue(leadData, "first_name") || fullName.split(" ")[0] || "";
      const lastName  = fieldValue(leadData, "last_name")  || fullName.split(" ").slice(1).join(" ");
      const name      = [firstName, lastName].filter(Boolean).join(" ") || fullName;
      const rawPhone  = fieldValue(leadData, "phone_number", "phone");
      const phone     = rawPhone.replace(/\D/g, "");
      const email     = fieldValue(leadData, "email");
      const moveDate  = fieldValue(leadData, "move_in_date", "moving_date");

      if (!firstName || phone.length < 10) continue;

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

      if (existing) continue;

      // Insert lead
      const { data: lead, error: leadErr } = await db
        .from("leads")
        .insert({
          property_id:  property.id,
          name,
          phone:        e164,
          email:        email || null,
          status:       "new",
          source:       "facebook",
          move_in_date: moveDate || null,
        })
        .select("id, name, phone, status")
        .single();

      if (leadErr || !lead) continue;

      await db.from("activity_logs").insert({
        action:      "new_lead",
        actor:       "system",
        lead_id:     lead.id,
        property_id: property.id,
        metadata:    { lead_name: name, source: "facebook", leadgen_id: leadgenId, operator_id: property.operator_id, property_name: property.name },
      });

      // AI welcome SMS
      try {
        const result = await generateLeadReply({
          leadName:            firstName,
          propertyName:        property.name,
          activeSpecial:       property.active_special ?? undefined,
          trigger:             "new_lead",
          conversationHistory: "",
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
    }
  }

  // Facebook requires 200 within 20 seconds or it retries
  return NextResponse.json({ ok: true });
}
