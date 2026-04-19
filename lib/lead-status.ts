// Lead status transition logic for LeaseUp Bulldog v1.
//
// Rules:
//   - Status only moves forward — we never downgrade (e.g. won → applied).
//   - Transitions are deterministic: given an event + current status, there is
//     exactly one correct outcome or no change.
//   - "won" and "lost" are terminal — no further transitions apply.
//   - Call `applyStatusTransition` after each event and persist the result if
//     it differs from the current status.

import type { LeadStatus } from "@/lib/types";

// ─── Events ───────────────────────────────────────────────────────────────────
// Each event corresponds to a real action that happened in the system.

export type LeadEvent =
  | "lead_created"           // a new lead record was inserted
  | "outbound_sms_sent"      // we sent an SMS to the lead
  | "inbound_sms_received"   // the lead replied to us
  | "tour_booked"            // a tour was scheduled (any mechanism)
  | "application_started"    // lead began filling out an application
  | "application_completed"; // lead submitted a completed application

// ─── Status order (for the "only move forward" rule) ─────────────────────────

const STATUS_RANK: Record<LeadStatus, number> = {
  new: 0,
  contacted: 1,
  engaged: 2,
  tour_scheduled: 3,
  applied: 4,
  won: 5,
  lost: 5, // same rank as won — both are terminal
};

function isTerminal(status: LeadStatus): boolean {
  return status === "won" || status === "lost";
}

function rankOf(status: LeadStatus): number {
  return STATUS_RANK[status];
}

// ─── Transition table ─────────────────────────────────────────────────────────
// Maps each event to the status it should produce.
// If the resolved status is not ahead of the current one, no change is made.

const TRANSITIONS: Record<LeadEvent, LeadStatus> = {
  lead_created: "new",
  outbound_sms_sent: "contacted",
  inbound_sms_received: "engaged",
  tour_booked: "tour_scheduled",
  application_started: "applied",
  application_completed: "won",
};

// ─── applyStatusTransition ────────────────────────────────────────────────────
//
// Returns the new status if a transition applies, or null if the status
// should remain unchanged.
//
// Usage:
//   const next = applyStatusTransition(lead.status, "inbound_sms_received");
//   if (next) await db.from("leads").update({ status: next }).eq("id", lead.id);

export function applyStatusTransition(
  current: LeadStatus,
  event: LeadEvent
): LeadStatus | null {
  // Terminal statuses don't transition (except manual override from the dashboard)
  if (isTerminal(current)) return null;

  const next = TRANSITIONS[event];

  // Only advance — never move backwards
  if (rankOf(next) <= rankOf(current)) return null;

  return next;
}

// ─── markAsLost ───────────────────────────────────────────────────────────────
//
// Separate helper for the "lost" path — it's a manual decision, not an event,
// so it bypasses the rank check. Can be called from the dashboard or a
// scheduled follow-up job when a lead goes cold.

export function markAsLost(current: LeadStatus): LeadStatus | null {
  if (isTerminal(current)) return null; // already won or lost
  return "lost";
}

// ─── getStatusLabel ───────────────────────────────────────────────────────────
// Human-readable label for display in the UI.

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  engaged: "Engaged",
  tour_scheduled: "Tour Scheduled",
  applied: "Applied",
  won: "Won",
  lost: "Lost",
};
