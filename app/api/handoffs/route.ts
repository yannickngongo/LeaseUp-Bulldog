// GET  /api/handoffs?property_id=... — list open handoffs
// POST /api/handoffs — manually create a handoff

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createHandoffEvent } from "@/lib/human-takeover";

const CreateHandoffSchema = z.object({
  lead_id:     z.string().uuid(),
  property_id: z.string().uuid(),
  reason:      z.enum([
    "asked_for_human", "frustration_detected", "policy_question",
    "technical_question", "escalation_trigger", "manual",
  ]),
  trigger_message: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("property_id");
  const operatorId = searchParams.get("operator_id");
  const status = searchParams.get("status") ?? "open,in_progress";

  const db = getSupabaseAdmin();
  const statuses = status.split(",");

  let query = db
    .from("handoff_events")
    .select("*, leads(name, phone, status)")
    .in("status", statuses)
    .order("created_at", { ascending: false });

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  } else if (operatorId) {
    // Filter by operator via property join
    const { data: props } = await db
      .from("properties").select("id").eq("operator_id", operatorId);
    const ids = props?.map((p: { id: string }) => p.id) ?? [];
    if (!ids.length) return NextResponse.json({ handoffs: [] });
    query = query.in("property_id", ids);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ handoffs: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateHandoffSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const handoff = await createHandoffEvent(
      parsed.data.lead_id,
      parsed.data.property_id,
      parsed.data.reason,
      parsed.data.trigger_message ?? "",
      "manual"
    );
    return NextResponse.json({ handoff }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
