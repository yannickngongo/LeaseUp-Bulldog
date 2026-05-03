// GET /api/conversations?leadId=... — fetch lead details + messages for a single lead.
// Validates that the caller's operator owns the lead's property.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadId =
    req.nextUrl.searchParams.get("leadId") ?? req.nextUrl.searchParams.get("lead_id");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = getSupabaseAdmin();

  const { data: lead, error: leadErr } = await db
    .from("leads")
    .select("*, properties(id, name, phone_number, operator_id)")
    .eq("id", leadId)
    .single();

  if (leadErr || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const property = (lead as Record<string, unknown>).properties as Record<string, string> | null;
  if (!property || property.operator_id !== ctx.operatorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: messages, error } = await db
    .from("conversations")
    .select("id, created_at, direction, body, ai_generated, twilio_sid")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  return NextResponse.json({ lead, messages: messages ?? [] });
}
