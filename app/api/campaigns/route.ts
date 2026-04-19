// GET  /api/campaigns?property_id=... — list campaigns
// POST /api/campaigns — create campaign with AI strategy + variations

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCampaign } from "@/lib/marketing";
import { getSupabaseAdmin } from "@/lib/supabase";

const CreateCampaignSchema = z.object({
  property_id:        z.string().uuid(),
  operator_id:        z.string().uuid(),
  current_special:    z.string().optional(),
  target_renter_type: z.string().optional(),
  pricing_summary:    z.string().optional(),
  occupancy_goal:     z.string().optional(),
  urgency:            z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateCampaignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const campaign = await createCampaign(parsed.data);

    // Fetch the generated ad variations
    const db = getSupabaseAdmin();
    const { data: variations } = await db
      .from("ad_variations")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("variation_num");

    return NextResponse.json({ campaign, variations }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("property_id");
  const operatorId = searchParams.get("operator_id");

  if (!propertyId && !operatorId) {
    return NextResponse.json({ error: "property_id or operator_id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  let query = db
    .from("campaigns")
    .select("*, ad_variations(*)")
    .order("created_at", { ascending: false });

  if (propertyId) query = query.eq("property_id", propertyId);
  if (operatorId) query = query.eq("operator_id", operatorId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ campaigns: data });
}
