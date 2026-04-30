// GET /api/cron/data-retention
// Weekly cron — purges old opt-out leads + their conversations after 365 days,
// in line with the data-retention policy in our terms. Records each deletion
// to data_deletion_log for compliance audit trail.
//
// Auth: CRON_SECRET via Authorization: Bearer header (Vercel cron sends this).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const RETENTION_DAYS = 365;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();

  // Find opt-out leads older than retention period
  const { data: leadsToDelete } = await db
    .from("leads")
    .select("id, property_id, name, phone")
    .eq("opt_out", true)
    .lt("opt_out_at", cutoff)
    .limit(500);  // safety cap per run

  if (!leadsToDelete || leadsToDelete.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, message: "No leads past retention threshold" });
  }

  const leadIds     = leadsToDelete.map(l => l.id);
  const errors: string[] = [];

  // Cascade delete child records first
  for (const table of ["conversations", "follow_up_tasks", "tours", "handoff_events", "activity_logs"]) {
    const { error } = await db.from(table).delete().in("lead_id", leadIds);
    if (error) errors.push(`${table}: ${error.message}`);
  }

  // Delete the leads themselves
  const { error: leadsErr } = await db.from("leads").delete().in("id", leadIds);
  if (leadsErr) errors.push(`leads: ${leadsErr.message}`);

  // Audit log: write a data_deletion_log row per lead so we can prove compliance
  await db.from("data_deletion_log").insert(
    leadsToDelete.map(l => ({
      lead_id:      l.id,
      property_id:  l.property_id,
      requested_by: "system_retention",
      method:       "auto_retention_365d",
      metadata:     { name: l.name, phone: l.phone, retention_days: RETENTION_DAYS },
    }))
  ).then(({ error }) => {
    if (error) errors.push(`data_deletion_log: ${error.message}`);
  });

  return NextResponse.json({
    ok:        errors.length === 0,
    deleted:   leadsToDelete.length,
    errors:    errors.length > 0 ? errors : undefined,
    cutoff,
  });
}
