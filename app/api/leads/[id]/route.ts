// PATCH /api/leads/[id] — update lead fields (status, notes, etc.)
// DELETE /api/leads/[id] — GDPR-compliant permanent deletion of a lead and all related data

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";
import { syncLeadToHubSpot } from "@/lib/hubspot";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("leads")
    .update(body)
    .eq("id", id)
    .select("*, properties(name, phone_number)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If status changed, sync to HubSpot (non-fatal)
  if (body.status && data) {
    const { data: op } = await db
      .from("operators")
      .select("hubspot_access_token")
      .eq("id", ctx.operatorId)
      .single();

    if (op?.hubspot_access_token) {
      const prop = (data as Record<string, unknown>).properties as Record<string, string> | null;
      syncLeadToHubSpot({
        accessToken: op.hubspot_access_token,
        lead: {
          id:            data.id,
          name:          data.name,
          phone:         data.phone,
          email:         data.email,
          status:        data.status,
          property_name: prop?.name ?? "",
          move_in_date:  data.move_in_date,
          budget_min:    data.budget_min,
          budget_max:    data.budget_max,
        },
      }).catch((err: unknown) => console.error("[hubspot] sync failed:", err));
    }
  }

  return NextResponse.json({ lead: data });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();

  // Fetch lead before deletion for audit log
  const { data: lead } = await db
    .from("leads")
    .select("id, property_id, name, phone")
    .eq("id", id)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Cascade delete all related data
  await Promise.all([
    db.from("conversations").delete().eq("lead_id", id),
    db.from("follow_up_tasks").delete().eq("lead_id", id),
    db.from("tours").delete().eq("lead_id", id),
    db.from("handoff_events").delete().eq("lead_id", id),
    db.from("activity_logs").delete().eq("lead_id", id),
  ]);

  const { error } = await db.from("leads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Write GDPR deletion log (survives the lead deletion for compliance)
  await db.from("data_deletion_log").insert({
    lead_id:      lead.id,
    property_id:  lead.property_id,
    operator_id:  ctx.operatorId,
    requested_by: ctx.email,
    method:       "gdpr_request",
    metadata:     { name: lead.name, phone: lead.phone },
  });

  return NextResponse.json({ ok: true, deleted_id: id });
}
