// POST /api/leases — record a signed lease
// GET  /api/leases?property_id=... — list leases for a property

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordLease } from "@/lib/billing";
import { getSupabaseAdmin } from "@/lib/supabase";

const CreateLeaseSchema = z.object({
  lead_id:            z.string().uuid(),
  property_id:        z.string().uuid(),
  operator_id:        z.string().uuid(),
  lease_signed_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rent_amount:        z.number().int().positive(),  // cents
  unit_number:        z.string().optional(),
  lease_start_date:   z.string().optional(),
  lease_end_date:     z.string().optional(),
  attribution_source: z.enum(["lub", "manual", "other"]).default("lub"),
  created_by:         z.string().min(1),
  notes:              z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateLeaseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const lease = await recordLease(parsed.data);
    return NextResponse.json({ lease }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("property_id");
  const operatorId = searchParams.get("operator_id");
  const billableOnly = searchParams.get("billable_only") === "true";

  if (!propertyId && !operatorId) {
    return NextResponse.json({ error: "property_id or operator_id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  let query = db.from("leases").select("*, leads(name, phone, status)").order("lease_signed_date", { ascending: false });

  if (propertyId) query = query.eq("property_id", propertyId);
  if (operatorId) query = query.eq("operator_id", operatorId);
  if (billableOnly) query = query.eq("is_billable", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leases: data });
}
