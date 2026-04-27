// PATCH /api/operators/settings — merge settings into operator.settings JSONB

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { settings } = await req.json();
  if (typeof settings !== "object") {
    return NextResponse.json({ error: "settings required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { data: op, error: fetchErr } = await db
    .from("operators")
    .select("id, settings")
    .eq("email", ctx.email)
    .single();

  if (fetchErr || !op) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const merged = { ...(op.settings ?? {}), ...settings };

  const { error: updateErr } = await db
    .from("operators")
    .update({ settings: merged })
    .eq("id", op.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: merged });
}
