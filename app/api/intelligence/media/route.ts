// GET  /api/intelligence/media?property_id=... — analyze property media
// POST /api/intelligence/media/campaign — recommend images for a campaign

import { NextRequest, NextResponse } from "next/server";
import { analyzePropertyMedia, recommendImagesForCampaign } from "@/lib/media-intelligence";

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get("property_id");
  if (!propertyId) return NextResponse.json({ error: "property_id required" }, { status: 400 });

  const result = await analyzePropertyMedia(propertyId);
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: NextRequest) {
  const { campaign_id } = await req.json();
  if (!campaign_id) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

  const result = await recommendImagesForCampaign(campaign_id);
  return NextResponse.json({ ok: true, ...result });
}
