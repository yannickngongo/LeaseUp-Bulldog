// GET /api/intelligence/risk?property_id=... — occupancy risk profile
// GET /api/intelligence/risk/narrative?property_id=... — property narrative

import { NextRequest, NextResponse } from "next/server";
import { calculateOccupancyRisk } from "@/lib/occupancy-risk";
import { generatePropertyNarrative } from "@/lib/narrative";
import { getPriorityQueue } from "@/lib/lead-prioritization";
import { generateWeeklyPropertyDigest } from "@/lib/digest";

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get("property_id");
  const include    = req.nextUrl.searchParams.get("include") ?? "risk";

  if (!propertyId) return NextResponse.json({ error: "property_id required" }, { status: 400 });

  const result: Record<string, unknown> = {};

  if (include.includes("risk"))      result.risk      = await calculateOccupancyRisk(propertyId);
  if (include.includes("narrative")) result.narrative  = await generatePropertyNarrative(propertyId);
  if (include.includes("leads"))     result.leads      = await getPriorityQueue(propertyId, 10);
  if (include.includes("digest"))    result.digest     = await generateWeeklyPropertyDigest(propertyId);

  return NextResponse.json({ ok: true, ...result });
}
