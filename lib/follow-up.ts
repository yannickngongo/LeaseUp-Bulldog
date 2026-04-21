// Persistent follow-up system.
// Manages scheduled outbound messages until a stop condition fires.
// Execution is triggered by Vercel Cron → POST /api/follow-up/execute (every 15 min).
//
// Cadence:
//   Burst phase  — first_contact (0h), follow_up_1 (24h), follow_up_2 (72h),
//                  follow_up_3 (7d), follow_up_4 (14d)
//   Nurture phase — monthly_touch every 30 days indefinitely
//
// The sequence only stops when a real stop condition fires (opt-out, lease signed,
// lead lost, human takeover, manual pause). It never self-terminates.
//
// Re-engagement: when a lead replies at any point, pending scheduled tasks are
// cancelled and a new monthly_touch is queued 7 days out. If they reply again
// before that fires, the clock resets. This means the AI always comes back.

import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";
import { getPropertyAIContext, formatPropertyAIContext } from "@/lib/property-ai-context";
import { setFirstContactDate } from "@/lib/billing";
import type { FollowUpTrigger, FollowUpPhase, CancelReason } from "@/lib/types";

// ─── Cadence ──────────────────────────────────────────────────────────────────

const BURST_CADENCE: Array<{ trigger: FollowUpTrigger; delayHours: number }> = [
  { trigger: "first_contact", delayHours: 0   },
  { trigger: "follow_up_1",   delayHours: 24  },
  { trigger: "follow_up_2",   delayHours: 72  },
  { trigger: "follow_up_3",   delayHours: 168 },
  { trigger: "follow_up_4",   delayHours: 336 },
];

const NURTURE_INTERVAL_HOURS = 720;    // 30 days between nurture touches
const RE_ENGAGE_AFTER_REPLY_HOURS = 168; // 7 days — re-engage if lead goes cold after replying

// ─── Phase ────────────────────────────────────────────────────────────────────

export function getFollowUpPhase(attemptNumber: number): FollowUpPhase {
  return attemptNumber <= BURST_CADENCE.length ? "burst" : "nurture";
}

// ─── Opt-out keywords ─────────────────────────────────────────────────────────

export const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "quit", "cancel", "end", "optout", "opt out", "opt-out"];

export function isOptOut(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return OPT_OUT_KEYWORDS.some(
    kw => normalized === kw || normalized.startsWith(kw + " ") || normalized.endsWith(" " + kw)
  );
}

// ─── Stop condition check ─────────────────────────────────────────────────────

async function getStopReason(leadId: string): Promise<CancelReason | null> {
  const db = getSupabaseAdmin();
  const { data: lead } = await db
    .from("leads")
    .select("status, opt_out, human_takeover, ai_paused")
    .eq("id", leadId)
    .single();

  if (!lead) return "lead_lost";
  if (lead.opt_out)         return "opted_out";
  if (lead.human_takeover)  return "human_takeover";
  if (lead.ai_paused)       return "manual_pause";
  if (lead.status === "won")  return "lease_signed";
  if (lead.status === "lost") return "lead_lost";
  return null;
}

// ─── Next attempt number ──────────────────────────────────────────────────────
// Counts completed + executing tasks to derive the next attempt number.

async function getNextAttemptNumber(leadId: string): Promise<number> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("follow_up_tasks")
    .select("attempt_number")
    .eq("lead_id", leadId)
    .in("status", ["completed", "executing"])
    .order("attempt_number", { ascending: false })
    .limit(1);
  return (data?.[0]?.attempt_number ?? 0) + 1;
}

// ─── queueFollowUp ────────────────────────────────────────────────────────────
// Schedules a follow-up task. Safe to call multiple times — checks for duplicates.

export async function queueFollowUp(
  leadId: string,
  propertyId: string,
  trigger: FollowUpTrigger,
  scheduledFor: Date,
  attemptNumber: number
): Promise<string | null> {
  const db = getSupabaseAdmin();

  const stopReason = await getStopReason(leadId);
  if (stopReason) return null;

  const { data: existing } = await db
    .from("follow_up_tasks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("trigger_reason", trigger)
    .eq("status", "pending")
    .limit(1);

  if (existing?.length) return existing[0].id;

  const { data: task, error } = await db
    .from("follow_up_tasks")
    .insert({
      lead_id:        leadId,
      property_id:    propertyId,
      scheduled_for:  scheduledFor.toISOString(),
      trigger_reason: trigger,
      attempt_number: attemptNumber,
      status:         "pending",
    })
    .select("id")
    .single();

  if (error || !task) {
    console.error("[follow-up] failed to queue task:", error?.message);
    return null;
  }

  return task.id;
}

// ─── cancelFollowUps ──────────────────────────────────────────────────────────

export async function cancelFollowUps(leadId: string, reason: CancelReason): Promise<void> {
  const db = getSupabaseAdmin();
  await db
    .from("follow_up_tasks")
    .update({
      status:           "cancelled",
      cancelled_reason: reason,
      cancelled_at:     new Date().toISOString(),
    })
    .eq("lead_id", leadId)
    .eq("status", "pending");
}

// ─── evaluateNextAction ───────────────────────────────────────────────────────
// Determines what to queue after a task executes or an inbound message arrives.
//
// inbound_reply: cancels any pending scheduled tasks (the lead is active), then
// queues a re-engagement monthly_touch 7 days out in case they go cold again.
//
// burst trigger: advances to the next burst step, or graduates to the first
// nurture touch after the final burst step.
//
// monthly_touch: re-schedules itself 30 days out — infinitely.

export async function evaluateNextAction(
  leadId: string,
  propertyId: string,
  completedTrigger: FollowUpTrigger | "inbound_reply"
): Promise<FollowUpTrigger | null> {
  const stopReason = await getStopReason(leadId);
  if (stopReason) {
    await cancelFollowUps(leadId, stopReason);
    return null;
  }

  if (completedTrigger === "inbound_reply") {
    // Lead is actively engaged — cancel any stale scheduled outreach
    await cancelFollowUps(leadId, "replied");
    // Re-arm: if they go cold again, check back in 7 days
    const nextAttempt = await getNextAttemptNumber(leadId);
    const reEngageAt = new Date();
    reEngageAt.setHours(reEngageAt.getHours() + RE_ENGAGE_AFTER_REPLY_HOURS);
    await queueFollowUp(leadId, propertyId, "monthly_touch", reEngageAt, nextAttempt);
    return "monthly_touch";
  }

  if (completedTrigger === "monthly_touch") {
    // Infinite nurture — re-schedule 30 days out
    const nextAttempt = await getNextAttemptNumber(leadId);
    const nextAt = new Date();
    nextAt.setHours(nextAt.getHours() + NURTURE_INTERVAL_HOURS);
    await queueFollowUp(leadId, propertyId, "monthly_touch", nextAt, nextAttempt);
    return "monthly_touch";
  }

  // Burst phase: advance to next step or graduate to nurture
  const currentIndex = BURST_CADENCE.findIndex(c => c.trigger === completedTrigger);
  const nextBurstStep = BURST_CADENCE[currentIndex + 1];

  if (nextBurstStep) {
    const nextAttempt = currentIndex + 2;
    const nextAt = new Date();
    nextAt.setHours(nextAt.getHours() + nextBurstStep.delayHours);
    await queueFollowUp(leadId, propertyId, nextBurstStep.trigger, nextAt, nextAttempt);
    return nextBurstStep.trigger;
  }

  // End of burst — graduate to nurture phase
  const nextAttempt = BURST_CADENCE.length + 1;
  const nurtureAt = new Date();
  nurtureAt.setHours(nurtureAt.getHours() + NURTURE_INTERVAL_HOURS);
  await queueFollowUp(leadId, propertyId, "monthly_touch", nurtureAt, nextAttempt);
  return "monthly_touch";
}

// ─── executeFollowUp ──────────────────────────────────────────────────────────
// Executes a single pending task: generates AI message, sends SMS, logs result.
// Called by the cron route. Idempotent — marks "executing" first to prevent double-runs.

export async function executeFollowUp(taskId: string): Promise<void> {
  const db = getSupabaseAdmin();

  // Claim atomically — prevents duplicate execution if cron overlaps
  const { data: task, error: claimErr } = await db
    .from("follow_up_tasks")
    .update({ status: "executing" })
    .eq("id", taskId)
    .eq("status", "pending")
    .select()
    .single();

  if (claimErr || !task) return;

  const stopReason = await getStopReason(task.lead_id);
  if (stopReason) {
    await db.from("follow_up_tasks").update({
      status:           "cancelled",
      cancelled_reason: stopReason,
      cancelled_at:     new Date().toISOString(),
    }).eq("id", taskId);
    await cancelFollowUps(task.lead_id, stopReason);
    return;
  }

  const [leadResult, propertyResult] = await Promise.all([
    db.from("leads").select("*").eq("id", task.lead_id).single(),
    db.from("properties").select("*").eq("id", task.property_id).single(),
  ]);

  const lead = leadResult.data;
  const property = propertyResult.data;

  if (!lead || !property) {
    await db.from("follow_up_tasks").update({
      status:        "failed",
      error_message: "Lead or property not found",
    }).eq("id", taskId);
    return;
  }

  const { data: history } = await db
    .from("conversations")
    .select("direction, body")
    .eq("lead_id", task.lead_id)
    .order("created_at", { ascending: true })
    .limit(10);

  const conversationHistory = (history ?? [])
    .map((m: { direction: string; body: string }) =>
      `${m.direction === "inbound" ? lead.name : "Leasing Team"}: ${m.body}`)
    .join("\n");

  const aiConfig = await getPropertyAIContext(task.property_id);
  const propertyContext = aiConfig ? formatPropertyAIContext(aiConfig) : undefined;

  const attemptNumber = task.attempt_number as number;
  const followUpPhase = getFollowUpPhase(attemptNumber);

  let aiMessage: string;
  try {
    const result = await generateLeadReply({
      propertyName:        property.name,
      activeSpecial:       property.active_special ?? undefined,
      leadName:            lead.name,
      moveInDate:          lead.move_in_date ?? undefined,
      bedrooms:            lead.bedrooms ?? undefined,
      budgetMin:           lead.budget_min ?? undefined,
      budgetMax:           lead.budget_max ?? undefined,
      trigger:             "follow_up",
      conversationHistory,
      propertyContext,
      attemptNumber,
      followUpPhase,
    });
    aiMessage = result.message;
  } catch (err) {
    await db.from("follow_up_tasks").update({
      status:        "failed",
      error_message: `AI generation failed: ${String(err)}`,
    }).eq("id", taskId);
    return;
  }

  let twilioSid: string | undefined;
  try {
    const smsResult = await sendSms({
      to:   lead.phone,
      body: aiMessage,
      from: property.phone_number,
    });
    twilioSid = smsResult?.sid;
  } catch (err) {
    await db.from("follow_up_tasks").update({
      status:        "failed",
      error_message: `SMS send failed: ${String(err)}`,
    }).eq("id", taskId);
    return;
  }

  const now = new Date().toISOString();

  await db.from("conversations").insert({
    lead_id:      task.lead_id,
    property_id:  task.property_id,
    direction:    "outbound",
    channel:      "sms",
    body:         aiMessage,
    twilio_sid:   twilioSid ?? null,
    ai_generated: true,
  });

  if (task.trigger_reason === "first_contact") {
    await setFirstContactDate(task.lead_id);
    await db.from("leads").update({ status: "contacted" }).eq("id", task.lead_id);
  }

  await db.from("follow_up_tasks").update({
    status:         "completed",
    executed_at:    now,
    result_message: aiMessage,
    twilio_sid:     twilioSid ?? null,
  }).eq("id", taskId);

  await db.from("activity_logs").insert({
    lead_id:     task.lead_id,
    property_id: task.property_id,
    action:      `follow_up_sent:${task.trigger_reason}`,
    actor:       "ai",
    metadata:    {
      task_id:       taskId,
      attempt:       attemptNumber,
      phase:         followUpPhase,
      preview:       aiMessage.slice(0, 100),
    },
  });

  await evaluateNextAction(
    task.lead_id,
    task.property_id,
    task.trigger_reason as FollowUpTrigger
  );
}
