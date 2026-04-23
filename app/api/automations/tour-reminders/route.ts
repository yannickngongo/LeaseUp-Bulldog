// POST /api/automations/tour-reminders
// Called hourly by Vercel cron. Sends SMS reminders 24h and 2h before scheduled tours.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendSms } from "@/lib/twilio";

interface TourRow {
  id: string;
  scheduled_at: string;
  lead_id: string;
  property_id: string;
  leads: { name: string; phone: string } | null;
  properties: { name: string; phone_number: string; operator_id: string } | null;
}

const REMINDER_WINDOWS = [
  { label: "24h", minBefore: 23 * 60, maxBefore: 25 * 60 },
  { label: "2h",  minBefore: 100,     maxBefore: 140 },
];

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getSupabaseAdmin();
  const now = new Date();
  let sent = 0;
  let skipped = 0;

  for (const window of REMINDER_WINDOWS) {
    const windowStart = new Date(now.getTime() + window.minBefore * 60000).toISOString();
    const windowEnd   = new Date(now.getTime() + window.maxBefore * 60000).toISOString();

    const { data: tours, error } = await db
      .from("tours")
      .select("id, scheduled_at, lead_id, property_id, leads(name, phone), properties(name, phone_number, operator_id)")
      .eq("status", "scheduled")
      .gte("scheduled_at", windowStart)
      .lte("scheduled_at", windowEnd);

    if (error || !tours) continue;

    for (const tour of tours as unknown as TourRow[]) {
      const lead     = tour.leads;
      const property = tour.properties;
      if (!lead || !property) { skipped++; continue; }

      // Check we haven't already sent this reminder type
      const reminderKey = `tour_reminder_${window.label}_${tour.id}`;
      const { count } = await db
        .from("activity_logs")
        .select("id", { count: "exact", head: true })
        .eq("action", "tour_reminder_sent")
        .contains("metadata", { reminder_key: reminderKey });

      if ((count ?? 0) > 0) { skipped++; continue; }

      const tourTime = new Date(tour.scheduled_at).toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit", timeZoneName: "short",
      });

      const body = window.label === "24h"
        ? `Hi ${lead.name}! Just a reminder — your tour at ${property.name} is tomorrow at ${tourTime}. Reply CONFIRM to confirm or CANCEL to cancel. See you soon! 🏠`
        : `Hi ${lead.name}! Your tour at ${property.name} is in about 2 hours (${tourTime}). We're excited to show you around! Reply CANCEL if your plans changed.`;

      const result = await sendSms({ to: lead.phone, body, from: property.phone_number });

      if (result.sid) {
        await db.from("activity_logs").insert({
          action:      "tour_reminder_sent",
          actor:       "system",
          lead_id:     tour.lead_id,
          property_id: tour.property_id,
          metadata:    {
            reminder_key: reminderKey,
            window: window.label,
            lead_name: lead.name,
            property_name: property.name,
            operator_id: property.operator_id,
          },
        });
        sent++;
      } else {
        skipped++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
