// PATCH /api/leads/[id] — update lead fields (status, notes, etc.)
// DELETE /api/leads/[id] — permanently delete a lead and its conversations

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("leads")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Delete child records first to avoid FK violations
  await db.from("conversations").delete().eq("lead_id", id);
  await db.from("activity_logs").delete().eq("lead_id", id);

  const { error } = await db.from("leads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
