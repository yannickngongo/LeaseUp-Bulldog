// GET  /api/properties/[id]/ai-config — fetch config for a property
// PATCH /api/properties/[id]/ai-config — upsert config for a property

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const PatchSchema = z.object({
  leasing_special_title:       z.string().optional(),
  leasing_special_description: z.string().optional(),
  pricing_notes:               z.string().optional(),
  application_link:            z.string().url().optional().or(z.literal("")),
  tour_instructions:           z.string().optional(),
  office_hours:                z.string().optional(),
  approved_faqs: z.array(z.object({
    question: z.string().min(1),
    answer:   z.string().min(1),
  })).optional(),
  objection_handling_notes: z.string().optional(),
  allowed_messaging:        z.string().optional(),
  disallowed_claims:        z.string().optional(),
  escalation_triggers:      z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("property_ai_configs")
    .select("*")
    .eq("property_id", id)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = not found
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: data ?? null });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("property_ai_configs")
    .upsert({ ...parsed.data, property_id: id }, { onConflict: "property_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: data });
}
