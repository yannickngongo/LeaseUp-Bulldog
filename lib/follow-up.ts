// Persistent follow-up system.
// Manages scheduled outbound messages until a stop condition fires.
// Execution is triggered by Vercel Cron → POST /api/follow-up/execute (every 15 min).

import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms } from "@/lib/twilio";
import { getPropertyAIContext, formatPropertyAIContext } from "@/lib/property-ai-context";
import { setFirstContactDate } from "@/lib/billing";
import type { FollowUpTrigger, CancelReason } from "@/lib/types";

// ─── Cadence ──────────────────────────────────────────────────────────────────
// delayHours is measured from when the lead was created / last activity.

const CADENCE: Array<{ trigger: FollowUpTrigger; delayHours: number }> = [
  { trigger: "first_contact",   delayHours: 0   },
  { trigger: "follow_up_1",     delayHours: 24  },
  { trigger: "follow_up_2",     delayHours: 72  },
  { trigger: "follow_up_3",     delayHours: 168 },
  { trigger: "follow_up_final", delayHours: 336 },
];

const MAX_UNANSWERED = 5; // stop after this many consecutive outbound-only messages

// ─── Opt-out keywords ─────────────────────────────────────────────────────────
// TCPA-required. Checked in inbound route before any AI processing.

export const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "quit", "cancel", "end", "optout", "opt out", "opt-out"];

export function isOptOut(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return OPT_OUT_KEYWORDS.some(kw => normalized === kw || normalized.startsWith(kw + " ") || normalized.endsWith(" " + kw));
}

// ─── Stop condition check ─────────────────────────────────────────────────────
// Returns the cancel reason if the lead should no longer receive follow-ups, else null.

async function getStopReason(leadId: string): Promise<CancelReason | null> {
  const db = getSupabaseAdmin();
  const { data: lead } = await db
    .from("leads")
    .select("status, opt_out, human_takeover, ai_paused")
    .eq("id", leadId)
    .single();

  if (!lead) return "lead_lost";
  if (lead.opt_out) return "opted_out";
  if (lead.human_takeover) return "human_takeover";
  if (lead.ai_paused) return "manual_pause";
  if (lead.status === "won") return "lease_signed";
  if (lead.status === "lost") return "lead_lost";
  return null;
}

// ─── Count unanswered outbound messages ───────────────────────────────────────

async function countUnansweredOutbound(leadId: string): Promise<number> {
  const db = getSupabaseAdmin();
  const { data: messages } = await db
    .from("conversations")
    .select("direction")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!messages?.length) return 0;

  let count = 0;
  for (const msg of messages) {
    if (msg.direction === "inbound") break;
    count++;
  }
  return count;
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

  // Don't queue if stop condition is already active
  const stopReason = await getStopReason(leadId);
  if (stopReason) return null;

  // Don't queue if an identical pending task already exists
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
// Cancels ALL pending follow-up tasks for a lead. Called on any stop condition.

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
// After a task executes (or an inbound message arrives), determines what to queue next.
// Returns the trigger that was queued, or null if the sequence is done.

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

  // If the lead replied, we don't need scheduled follow-ups — AI will reply inline
  if (completedTrigger === "inbound_reply") {
    await cancelFollowUps(leadId, "replied");
    return null;
  }

  const unanswered = await countUnansweredOutbound(leadId);
  if (unanswered >= MAX_UNANSWERED) {
    await cancelFollowUps(leadId, "manual_pause");
    return null;
  }

  const currentIndex = CADENCE.findIndex(c => c.trigger === completedTrigger);
  const nextStep = CADENCE[currentIndex + 1];
  if (!nextStep) return null;

  const scheduledFor = new Date();
  scheduledFor.setHours(scheduledFor.getHours() + nextStep.delayHours);

  await queueFollowUp(leadId, propertyId, nextStep.trigger, scheduledFor, currentIndex + 2);
  return nextStep.trigger;
}

// ─── executeFollowUp ──────────────────────────────────────────────────────────
// Executes a single pending task: generates AI message, sends SMS, logs result.
// Called by the cron route. Idempotent — marks "executing" first to prevent double-runs.

export async function executeFollowUp(taskId: string): Promise<void> {
  const db = getSupabaseAdmin();

  // Claim the task atomically — prevents duplicate execution if cron overlaps
  const { data: task, error: claimErr } = await db
    .from("follow_up_tasks")
    .update({ status: "executing" })
    .eq("id", taskId)
    .eq("status", "pending") // only claim if still pending
    .select()
    .single();

  if (claimErr || !task) return; // already claimed by another worker

  // Re-check stop conditions after claiming
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

  // Load lead + property
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

  // Load conversation history (last 10, oldest first)
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

  // Load property AI context
  const aiConfig = await getPropertyAIContext(task.property_id);
  const propertyContext = aiConfig ? formatPropertyAIContext(aiConfig) : undefined;

  // Generate AI reply
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
    });
    aiMessage = result.message;
  } catch (err) {
    await db.from("follow_up_tasks").update({
      status:        "failed",
      error_message: `AI generation failed: ${String(err)}`,
    }).eq("id", taskId);
    return;
  }

  // Send SMS
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

  // Log outbound message
  await db.from("conversations").insert({
    lead_id:      task.lead_id,
    property_id:  task.property_id,
    direction:    "outbound",
    channel:      "sms",
    body:         aiMessage,
    twilio_sid:   twilioSid ?? null,
    ai_generated: true,
  });

  // Set first_contact_date if this is the first outbound
  if (task.trigger_reason === "first_contact") {
    await setFirstContactDate(task.lead_id);
    await db.from("leads").update({ status: "contacted" }).eq("id", task.lead_id);
  }

  // Mark task complete
  await db.from("follow_up_tasks").update({
    status:         "completed",
    executed_at:    now,
    result_message: aiMessage,
    twilio_sid:     twilioSid ?? null,
  }).eq("id", taskId);

  // Log activity
  await db.from("activity_logs").insert({
    lead_id:     task.lead_id,
    property_id: task.property_id,
    action:      `follow_up_sent:${task.trigger_reason}`,
    actor:       "ai",
    metadata:    { task_id: taskId, preview: aiMessage.slice(0, 100) },
  });

  // Evaluate and queue next step
  await evaluateNextAction(
    task.lead_id,
    task.property_id,
    task.trigger_reason as FollowUpTrigger
  );
}
