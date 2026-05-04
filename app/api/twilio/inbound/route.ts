// POST /api/twilio/inbound — receives inbound SMS from prospects via Twilio webhook
//
// Setup: Twilio console → Phone Numbers → [number] → "A message comes in"
//   Webhook URL: https://yourdomain.com/api/twilio/inbound   Method: HTTP POST
//
// Processing order (each step can short-circuit and return TWIML_OK):
//   1. Parse + validate Twilio form data
//   2. Match To → property, From → lead
//   3. Check idempotency (duplicate MessageSid)
//   4. Opt-out detection (TCPA) — if opt-out, mark lead and stop
//   5. Store inbound message
//   6. Check stop conditions (human_takeover, ai_paused, lead status)
//   7. Escalation detection → create handoff if triggered
//   8. Generate AI reply (with property context injected)
//   9. Send reply via Twilio REST
//   10. Store outbound message, update lead, queue next follow-up check

import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import twilio from "twilio";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";
import { isOptOut, cancelFollowUps, evaluateNextAction, scheduleTourFollowUps } from "@/lib/follow-up";
import { detectEscalation, createHandoffEvent } from "@/lib/human-takeover";
import { getPropertyAIContext, formatPropertyAIContext } from "@/lib/property-ai-context";
import { setFirstContactDate } from "@/lib/billing";
import { sendHotLeadAlert, sendHumanTakeoverAlert, sendTourRequestedAlert, sendApplicationCompleteAlert } from "@/lib/email";

const TWIML_OK = new NextResponse(
  `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
  { status: 200, headers: { "Content-Type": "text/xml" } }
);

const OPT_OUT_REPLY =
  "You have been unsubscribed and will no longer receive messages from us. Reply START to re-subscribe.";

async function logActivity(
  db: SupabaseClient,
  entry: {
    lead_id: string;
    property_id: string;
    action: string;
    actor: "system" | "ai" | "agent";
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await db.from("activity_logs").insert(entry);
  if (error) console.error(`[activity_logs] failed to log "${entry.action}":`, error);
}

export async function POST(req: NextRequest) {
  // ── 0. Twilio signature validation ────────────────────────────────────────
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const twilioSig = req.headers.get("x-twilio-signature") ?? "";
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const webhookUrl = `${appUrl}/api/twilio/inbound`;

  // Read the raw body for signature validation, then re-parse as form data
  const rawBody = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody).entries()) {
    params[k] = v;
  }

  if (!authToken) {
    console.error("[twilio/inbound] TWILIO_AUTH_TOKEN not set — rejecting request");
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Try the configured URL, then also the www/non-www variant in case of redirects
  const altUrl = webhookUrl.includes("://www.")
    ? webhookUrl.replace("://www.", "://")
    : webhookUrl.replace("://", "://www.");
  const valid =
    twilio.validateRequest(authToken, twilioSig, webhookUrl, params) ||
    twilio.validateRequest(authToken, twilioSig, altUrl, params);

  console.log("[twilio/inbound] sig check:", { webhookUrl, altUrl, valid, hasSig: !!twilioSig, hasToken: !!authToken });

  if (!valid) {
    console.warn("[twilio/inbound] invalid Twilio signature — rejected");
    return new NextResponse("Forbidden", { status: 403 });
  }

  const from       = params["From"] ?? "";
  const to         = params["To"] ?? "";
  const body       = params["Body"] ?? "";
  const messageSid = params["MessageSid"] ?? "";

  if (!from || !to || !body || !messageSid) {
    console.error("[twilio/inbound] missing required fields", { from, to, body, messageSid });
    return TWIML_OK;
  }

  const db = getSupabaseAdmin();

  // ── 1. Match To → property ────────────────────────────────────────────────
  const { data: property } = await db
    .from("properties")
    .select("id, name, phone_number, active_special, notify_email, timezone, address, city, state, zip")
    .eq("phone_number", to)
    .single();

  if (!property) {
    console.warn("[twilio/inbound] no property found for number:", to);
    // No property_id available — log to a sentinel row so operator can see unrouted SMS
    await db.from("activity_logs").insert({
      lead_id:     "00000000-0000-0000-0000-000000000000",
      property_id: "00000000-0000-0000-0000-000000000000",
      action:      "inbound_sms_no_property",
      actor:       "system",
      metadata:    { from, to, preview: body.slice(0, 100) },
    });
    return TWIML_OK;
  }

  // ── 2. Match From → lead (auto-create if unknown number texts cold) ───────
  const { data: existingLeads } = await db
    .from("leads")
    .select("id, name, email, status, opt_out, human_takeover, ai_paused, move_in_date, bedrooms, budget_min, budget_max")
    .eq("phone", from)
    .eq("property_id", property.id)
    .order("created_at", { ascending: false })
    .limit(1);

  let lead = existingLeads?.[0] ?? null;

  if (!lead) {
    // Cold inbound — they texted us first, so TCPA consent is implicit. Create a placeholder
    // record so we can chat with them and capture their info via the AI.
    const last4 = from.slice(-4);
    const placeholderName = `Unknown — ${last4}`;
    const { data: created, error: createErr } = await db
      .from("leads")
      .insert({
        property_id:           property.id,
        phone:                 from,
        name:                  placeholderName,
        status:                "new",
        source:                "sms_inbound",
        preferred_contact:     "sms",
        first_contact_date:    new Date().toISOString(),
      })
      .select("id, name, email, status, opt_out, human_takeover, ai_paused, move_in_date, bedrooms, budget_min, budget_max")
      .single();

    if (createErr || !created) {
      console.error("[twilio/inbound] failed to auto-create lead:", createErr);
      await logActivity(db, {
        lead_id:     "00000000-0000-0000-0000-000000000000",
        property_id: property.id,
        action:      "inbound_sms_unmatched",
        actor:       "system",
        metadata:    { from, preview: body.slice(0, 100), error: createErr?.message },
      });
      return TWIML_OK;
    }

    lead = created;
    console.log("[twilio/inbound] auto-created lead", lead.id, "for unknown number", from);
    await logActivity(db, {
      lead_id:     lead.id,
      property_id: property.id,
      action:      "lead_auto_created",
      actor:       "system",
      metadata:    { from, source: "sms_inbound", preview: body.slice(0, 100) },
    });
  }

  // ── 3. Idempotency — skip if we've already processed this MessageSid ──────
  const { data: existing } = await db
    .from("conversations")
    .select("id")
    .eq("twilio_sid", messageSid)
    .limit(1);

  if (existing?.length) {
    console.warn("[twilio/inbound] duplicate MessageSid, skipping:", messageSid);
    await logActivity(db, {
      lead_id:     lead.id,
      property_id: property.id,
      action:      "inbound_sms_duplicate",
      actor:       "system",
      metadata:    { twilio_sid: messageSid },
    });
    return TWIML_OK;
  }

  // ── 4. Opt-out detection (TCPA — must handle before anything else) ────────
  if (isOptOut(body)) {
    await db.from("leads").update({
      opt_out:    true,
      opt_out_at: new Date().toISOString(),
    }).eq("id", lead.id);

    await cancelFollowUps(lead.id, "opted_out");

    // Log the inbound opt-out message
    await db.from("conversations").insert({
      lead_id:      lead.id,
      property_id:  property.id,
      direction:    "inbound",
      channel:      "sms",
      body,
      twilio_sid:   messageSid,
      ai_generated: false,
    });

    // Send mandatory opt-out confirmation
    try {
      await sendSms({ to: from, body: OPT_OUT_REPLY, from: property.phone_number });
    } catch (err) {
      console.error("[twilio/inbound] failed to send opt-out reply:", err);
    }

    await logActivity(db, {
      lead_id:     lead.id,
      property_id: property.id,
      action:      "lead_opted_out",
      actor:       "system",
      metadata:    { preview: body.slice(0, 100) },
    });

    return TWIML_OK;
  }

  // ── 5. Store inbound message ───────────────────────────────────────────────
  const { error: inboundErr } = await db.from("conversations").insert({
    lead_id:      lead.id,
    property_id:  property.id,
    direction:    "inbound",
    channel:      "sms",
    body,
    twilio_sid:   messageSid,
    ai_generated: false,
  });

  if (inboundErr) {
    console.error("[twilio/inbound] failed to log inbound message:", inboundErr);
    await logActivity(db, {
      lead_id:     lead.id,
      property_id: property.id,
      action:      "ai_skipped_db_error",
      actor:       "system",
      metadata:    { reason: "failed_to_store_inbound", error: String(inboundErr.message ?? inboundErr) },
    });
    return TWIML_OK;
  }

  await logActivity(db, {
    lead_id:     lead.id,
    property_id: property.id,
    action:      "sms_received",
    actor:       "system",
    metadata:    { twilio_sid: messageSid, preview: body.slice(0, 100) },
  });

  // Update lead engagement status — alert operator on first engagement
  const isFirstEngagement = lead.status === "new" || lead.status === "contacted";
  if (isFirstEngagement) {
    await db.from("leads").update({
      status:            "engaged",
      last_contacted_at: new Date().toISOString(),
    }).eq("id", lead.id);

    if (property.notify_email) {
      sendHotLeadAlert({
        to:             property.notify_email,
        leadName:       lead.name,
        leadPhone:      from,
        propertyName:   property.name,
        propertyId:     property.id,
        leadId:         lead.id,
        messagePreview: body.slice(0, 200),
      }).catch((err: unknown) => console.error("[twilio/inbound] hot lead alert failed:", err));
    }
  } else {
    await db.from("leads").update({
      last_contacted_at: new Date().toISOString(),
    }).eq("id", lead.id);
  }

  // Tour request detection — alert operator if lead mentions scheduling
  if (
    property.notify_email &&
    !isFirstEngagement &&
    /\b(tour|schedule|visit|show|appointment|come in|come by|see the)\b/i.test(body)
  ) {
    sendTourRequestedAlert({
      to:             property.notify_email,
      leadName:       lead.name,
      leadPhone:      from,
      propertyName:   property.name,
      propertyId:     property.id,
      leadId:         lead.id,
      messagePreview: body.slice(0, 200),
    }).catch((err: unknown) => console.error("[twilio/inbound] tour alert failed:", err));
  }

  // This was a reply — cancel any pending scheduled follow-ups
  await evaluateNextAction(lead.id, property.id, "inbound_reply");

  // ── 6. Check stop conditions ──────────────────────────────────────────────
  if (lead.opt_out) return TWIML_OK; // already handled above but safety guard
  if (lead.human_takeover) {
    console.log("[twilio/inbound] human takeover active for lead:", lead.id);
    await logActivity(db, {
      lead_id:     lead.id,
      property_id: property.id,
      action:      "ai_skipped_human_takeover",
      actor:       "system",
      metadata:    { reason: "human_takeover_active" },
    });
    return TWIML_OK;
  }
  if (lead.ai_paused) {
    console.log("[twilio/inbound] AI paused for lead:", lead.id);
    await logActivity(db, {
      lead_id:     lead.id,
      property_id: property.id,
      action:      "ai_skipped_paused",
      actor:       "system",
      metadata:    { reason: "ai_paused_for_lead" },
    });
    return TWIML_OK;
  }
  if (lead.status === "won" || lead.status === "lost") {
    await logActivity(db, {
      lead_id:     lead.id,
      property_id: property.id,
      action:      "ai_skipped_lead_closed",
      actor:       "system",
      metadata:    { reason: `lead_status_${lead.status}` },
    });
    return TWIML_OK;
  }

  // ── 7. Escalation detection ───────────────────────────────────────────────
  const aiConfig = await getPropertyAIContext(property.id);
  const escalationResult = await detectEscalation(
    body,
    aiConfig?.escalation_triggers ?? []
  );

  if (escalationResult.shouldEscalate && escalationResult.reason) {
    try {
      await createHandoffEvent(lead.id, property.id, escalationResult.reason, body, "ai");
    } catch (err) {
      console.error("[twilio/inbound] failed to create handoff:", err);
    }

    if (property.notify_email) {
      sendHumanTakeoverAlert({
        to:           property.notify_email,
        leadName:     lead.name,
        leadPhone:    from,
        propertyName: property.name,
        propertyId:   property.id,
        leadId:       lead.id,
        reason:       escalationResult.reason,
        lastMessage:  body.slice(0, 200),
      }).catch((err: unknown) => console.error("[twilio/inbound] takeover alert failed:", err));
    }

    return TWIML_OK; // AI does not reply — human takes over
  }

  // ── 8. Build conversation history ─────────────────────────────────────────
  const { data: history } = await db
    .from("conversations")
    .select("direction, body")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const conversationHistory = (history ?? [])
    .reverse()
    .map((m: { direction: string; body: string }) =>
      `${m.direction === "inbound" ? lead.name : "Leasing Team"}: ${m.body}`)
    .join("\n");

  const propertyContext = aiConfig ? formatPropertyAIContext(aiConfig) : undefined;

  // ── 9. Generate AI reply ──────────────────────────────────────────────────
  let aiMessage: string;
  let tourBookingAt: string | undefined;
  let applicationCompleted = false;
  let parsedName: string | undefined;
  let parsedEmail: string | undefined;
  // A name is "missing" if it's the auto-created placeholder, blank, or generic
  const leadEmail = (lead as Record<string, unknown>).email as string | null | undefined;
  const needsName = !lead.name || /^Unknown\b/i.test(lead.name) || lead.name.trim().length < 2;
  const needsEmail = !leadEmail || !/@/.test(leadEmail);
  try {
    const p = property as Record<string, unknown>;
    const addressParts = [p.address, p.city, p.state, p.zip].filter(Boolean);
    const result = await generateLeadReply({
      propertyName:        property.name,
      propertyAddress:     addressParts.length ? addressParts.join(", ") : undefined,
      activeSpecial:       property.active_special ?? undefined,
      tourBookingUrl:      p.tour_booking_url as string | undefined,
      leadName:            lead.name,
      leadEmail:           leadEmail ?? undefined,
      needsName,
      needsEmail,
      moveInDate:          lead.move_in_date ?? undefined,
      bedrooms:            lead.bedrooms ?? undefined,
      budgetMin:           lead.budget_min ?? undefined,
      budgetMax:           lead.budget_max ?? undefined,
      trigger:             "inbound_sms",
      conversationHistory,
      propertyContext,
    });
    aiMessage             = result.message;
    tourBookingAt         = result.tourBookingAt;
    applicationCompleted  = Boolean(result.applicationCompleted);
    parsedName            = result.parsedName;
    parsedEmail           = result.parsedEmail;
  } catch (err) {
    console.error("[twilio/inbound] AI generation failed:", err);
    await logActivity(db, {
      lead_id:     lead.id,
      property_id: property.id,
      action:      "ai_generation_failed",
      actor:       "system",
      metadata:    { error: err instanceof Error ? err.message : String(err) },
    });
    return TWIML_OK;
  }

  // ── 10. Send reply ────────────────────────────────────────────────────────
  let twilioSid: string;
  try {
    const smsResult = await sendSms({ to: from, body: aiMessage, from: property.phone_number });
    twilioSid = smsResult.sid;
  } catch (err) {
    console.error("[twilio/inbound] SMS send failed:", err);
    await logActivity(db, {
      lead_id:     lead.id,
      property_id: property.id,
      action:      "sms_send_failed",
      actor:       "system",
      metadata:    {
        error:   err instanceof Error ? err.message : String(err),
        preview: aiMessage.slice(0, 100),
      },
    });
    return TWIML_OK;
  }

  // ── 11. Store outbound + update lead ──────────────────────────────────────
  await db.from("conversations").insert({
    lead_id:      lead.id,
    property_id:  property.id,
    direction:    "outbound",
    channel:      "sms",
    body:         aiMessage,
    twilio_sid:   twilioSid,
    ai_generated: true,
  });

  // ── 12. If AI confirmed a tour, cancel any existing and create a new record ─
  if (tourBookingAt) {
    // Cancel any previously scheduled tours for this lead (rescheduling case)
    await db.from("tours")
      .update({ status: "cancelled" })
      .eq("lead_id", lead.id)
      .eq("status", "scheduled");

    const { error: tourErr } = await db.from("tours").insert({
      lead_id:      lead.id,
      property_id:  property.id,
      scheduled_at: tourBookingAt,
      status:       "scheduled",
      notes:        "Booked via AI SMS",
    });
    if (tourErr) {
      console.error("[twilio/inbound] failed to create tour record:", tourErr);
    } else {
      await db.from("leads").update({ status: "tour_scheduled" }).eq("id", lead.id);
      console.log("[twilio/inbound] tour record created for:", tourBookingAt);
      // Queue post-tour check-in and application nudge (non-fatal)
      scheduleTourFollowUps(lead.id, property.id, new Date(tourBookingAt)).catch((err) =>
        console.error("[twilio/inbound] scheduleTourFollowUps failed:", err)
      );
    }
  }

  // Set first_contact_date if not already set (e.g. lead was created manually)
  await setFirstContactDate(lead.id);

  // ── 12b. Capture lead identity if AI extracted it ─────────────────────────
  if (parsedName || parsedEmail) {
    const updates: Record<string, unknown> = {};
    if (parsedName  && needsName)  updates.name  = parsedName;
    if (parsedEmail && needsEmail) updates.email = parsedEmail;
    // If the placeholder was the only name we had, always overwrite it
    if (parsedName && /^Unknown\b/i.test(lead.name)) updates.name = parsedName;

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await db.from("leads").update(updates).eq("id", lead.id);
      if (updErr) {
        console.error("[twilio/inbound] failed to update lead identity:", updErr);
      } else {
        await logActivity(db, {
          lead_id:     lead.id,
          property_id: property.id,
          action:      "lead_identity_captured",
          actor:       "ai",
          metadata:    {
            captured_name:  updates.name  ?? null,
            captured_email: updates.email ?? null,
          },
        });
      }
    }
  }

  // ── 13. Application complete — flip status, kill follow-ups, alert operator ─
  if (applicationCompleted) {
    await db.from("leads").update({
      status:            "applied",
      last_contacted_at: new Date().toISOString(),
    }).eq("id", lead.id);

    await cancelFollowUps(lead.id, "application_complete");

    await logActivity(db, {
      lead_id:     lead.id,
      property_id: property.id,
      action:      "application_completed",
      actor:       "ai",
      metadata:    { detected_from: body.slice(0, 100) },
    });

    if (property.notify_email) {
      sendApplicationCompleteAlert({
        to:             property.notify_email,
        leadName:       lead.name,
        leadPhone:      from,
        propertyName:   property.name,
        propertyId:     property.id,
        leadId:         lead.id,
        messagePreview: body.slice(0, 200),
      }).catch((err: unknown) =>
        console.error("[twilio/inbound] application complete alert failed:", err)
      );
    }
  }

  await logActivity(db, {
    lead_id:     lead.id,
    property_id: property.id,
    action:      "sms_sent",
    actor:       "ai",
    metadata:    { trigger: "inbound_sms", preview: aiMessage.slice(0, 100) },
  });

  return TWIML_OK;
}
