// POST /api/intelligence/campaign-optimize — analyze and generate optimization actions
// PATCH /api/intelligence/campaign-optimize — apply an optimization action

import { NextRequest, NextResponse } from "next/server";
import { analyzeCampaignOptimization, applyCampaignOptimization } from "@/lib/campaign-optimization";

export async function POST(req: NextRequest) {
  const { campaign_id } = await req.json();
  if (!campaign_id) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

  const result = await analyzeCampaignOptimization(campaign_id);
  return NextResponse.json({ ok: true, ...result });
}

export async function PATCH(req: NextRequest) {
  const { action_id } = await req.json();
  if (!action_id) return NextResponse.json({ error: "action_id required" }, { status: 400 });

  const result = await applyCampaignOptimization(action_id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
