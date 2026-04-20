// POST /api/intelligence/offer-lab — analyze and score an offer
// GET  /api/intelligence/offer-lab?property_id=... — list recent runs

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { analyzeOffer } from "@/lib/offer-lab";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { propertyId, operatorId, specialOffer } = body;
  if (!propertyId || !operatorId || !specialOffer) {
    return NextResponse.json({ error: "propertyId, operatorId, and specialOffer required" }, { status: 400 });
  }

  const result = await analyzeOffer({
    propertyId,
    operatorId,
    campaignName:   body.campaignName,
    specialOffer,
    targetRenter:   body.targetRenter,
    budgetCents:    body.budgetCents,
    campaignGoal:   body.campaignGoal,
    selectedImages: body.selectedImages,
  });

  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get("property_id");
  if (!propertyId) return NextResponse.json({ error: "property_id required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("offer_lab_runs")
    .select("*, offer_scores(*), offer_recommendations(*), offer_simulations(*)")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ ok: true, runs: data ?? [] });
}
