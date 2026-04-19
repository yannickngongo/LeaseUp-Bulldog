// PATCH /api/handoffs/[id] — assign, resolve, or return to AI

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveHandoff, returnToAI } from "@/lib/human-takeover";
import { getSupabaseAdmin } from "@/lib/supabase";

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action:   z.literal("assign"),
    assigned_to: z.string().email(),
  }),
  z.object({
    action:           z.literal("resolve"),
    resolution_notes: z.string().optional(),
  }),
  z.object({
    action:  z.literal("return_to_ai"),
    lead_id: z.string().uuid(),
  }),
]);

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

  try {
    if (parsed.data.action === "assign") {
      const now = new Date().toISOString();
      const { data, error } = await db
        .from("handoff_events")
        .update({
          assigned_to: parsed.data.assigned_to,
          assigned_at: now,
          status:      "in_progress",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ handoff: data });
    }

    if (parsed.data.action === "resolve") {
      await resolveHandoff(id, parsed.data.resolution_notes);
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.action === "return_to_ai") {
      await returnToAI(id, parsed.data.lead_id);
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
