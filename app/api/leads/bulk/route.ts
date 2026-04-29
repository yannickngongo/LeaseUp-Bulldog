// POST /api/leads/bulk — bulk actions on multiple leads at once
//
// Body: { action: "status" | "delete", leadIds: string[], value?: string }
//   action "status": updates all leads to { status: value }
//   action "delete": deletes all leads and their child records

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const BulkSchema = z.object({
  action:  z.enum(["status", "delete"]),
  leadIds: z.array(z.string().uuid()).min(1).max(100),
  value:   z.string().optional(), // required for "status" action
});

export async function POST(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate-limit: 10 bulk ops per operator per minute
  if (!rateLimit(`bulk:${ctx.operatorId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!rateLimit(`bulk-ip:${getClientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { action, leadIds, value } = parsed.data;
  const db = getSupabaseAdmin();

  // Verify all leads belong to this operator (security guard)
  const { data: leads } = await db
    .from("leads")
    .select("id, property_id, name, phone, properties!inner(operator_id)")
    .in("id", leadIds)
    .eq("properties.operator_id", ctx.operatorId);

  const verifiedIds = (leads ?? []).map((l: { id: string }) => l.id);
  if (!verifiedIds.length) {
    return NextResponse.json({ error: "No accessible leads found" }, { status: 404 });
  }

  if (action === "status") {
    if (!value) return NextResponse.json({ error: "value required for status action" }, { status: 422 });

    const { error } = await db
      .from("leads")
      .update({ status: value, updated_at: new Date().toISOString() })
      .in("id", verifiedIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await db.from("activity_logs").insert(
      verifiedIds.map((lid: string) => ({
        lead_id:     lid,
        property_id: (leads ?? []).find((l: { id: string }) => l.id === lid)?.property_id ?? "",
        action:      `bulk_status_change:${value}`,
        actor:       "agent",
        metadata:    { operator: ctx.email },
      }))
    );

    return NextResponse.json({ ok: true, updated: verifiedIds.length });
  }

  if (action === "delete") {
    // Cascade delete all child records then leads
    await Promise.all([
      db.from("conversations").delete().in("lead_id", verifiedIds),
      db.from("follow_up_tasks").delete().in("lead_id", verifiedIds),
      db.from("tours").delete().in("lead_id", verifiedIds),
      db.from("handoff_events").delete().in("lead_id", verifiedIds),
      db.from("activity_logs").delete().in("lead_id", verifiedIds),
    ]);

    const { error } = await db.from("leads").delete().in("id", verifiedIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // GDPR log for each deleted lead
    await db.from("data_deletion_log").insert(
      (leads ?? []).map((l: { id: string; property_id: string; name: string; phone: string }) => ({
        lead_id:      l.id,
        property_id:  l.property_id,
        operator_id:  ctx.operatorId,
        requested_by: ctx.email,
        method:       "bulk_delete",
        metadata:     { name: l.name, phone: l.phone },
      }))
    );

    return NextResponse.json({ ok: true, deleted: verifiedIds.length });
  }
}
