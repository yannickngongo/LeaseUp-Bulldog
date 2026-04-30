// Webhook idempotency helpers — call seenWebhook(...) at the top of every webhook
// handler. If it returns true, the event was already processed and you should
// short-circuit with a 200 OK without re-doing the work.

import { getSupabaseAdmin } from "@/lib/supabase";

export type WebhookSource = "stripe" | "meta" | "google" | "twilio";

/**
 * Atomically check-and-mark a webhook event as processed.
 * Returns true if this is a duplicate (already processed before).
 *
 * Uses a unique constraint on (source, event_id) to make this race-safe.
 * If two duplicate deliveries hit at the same time, only one INSERT succeeds.
 */
export async function seenWebhook(
  source:    WebhookSource,
  eventId:   string,
  eventType: string,
  payload?:  Record<string, unknown>
): Promise<boolean> {
  if (!eventId) return false;  // Can't dedupe without an ID — let it through
  const db = getSupabaseAdmin();

  const { error } = await db.from("webhook_events").insert({
    source,
    event_id:   eventId,
    event_type: eventType,
    status:     "processed",
    payload:    payload ? truncateForLog(payload) : null,
  });

  // Postgres unique violation = 23505 (we collided with an earlier delivery)
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") return true; // already seen
    console.error(`[webhook-idempotency] insert failed for ${source}/${eventId}:`, error);
    return false;  // Fail open: process the event anyway, better than dropping it
  }
  return false;
}

/** Mark an event as failed (after handler error) — useful for debugging. */
export async function markWebhookFailed(
  source:  WebhookSource,
  eventId: string,
  error:   string
): Promise<void> {
  if (!eventId) return;
  const db = getSupabaseAdmin();
  await db
    .from("webhook_events")
    .update({ status: "failed", error: error.slice(0, 1000) })
    .eq("source", source)
    .eq("event_id", eventId);
}

// Truncate payloads to avoid blowing up DB row size with multi-MB webhook bodies
function truncateForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(obj);
  if (json.length <= 8000) return obj;
  return { _truncated: true, preview: json.slice(0, 8000) };
}
