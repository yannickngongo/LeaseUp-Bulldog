// GET  /api/automations — list automations for an operator
// POST /api/automations — create or upsert an automation rule
// PATCH /api/automations — toggle enabled/disabled

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("automation_rules")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ automations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, automation } = body;
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const row = {
    operator_id:    ctx.operatorId,
    name:           automation.name,
    trigger:        automation.trigger,
    action:         automation.action,
    action_detail:  automation.actionDetail ?? "",
    enabled:        automation.enabled ?? true,
    category:       automation.category ?? "follow_up",
  };

  const { data, error } = automation.id
    ? await db.from("automation_rules").update(row).eq("id", automation.id).select().single()
    : await db.from("automation_rules").insert(row).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, automation: data });
}

export async function PATCH(req: NextRequest) {
  const { id, enabled, email } = await req.json();
  if (!email || !id) return NextResponse.json({ error: "id and email required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("automation_rules")
    .update({ enabled })
    .eq("id", id)
    .eq("operator_id", ctx.operatorId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
