// GET /api/analytics/dashboard?operator_id=...&property_ids=id1,id2
// Requires Authorization: Bearer <CRON_SECRET> — internal/admin use only.

import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/analytics";

function requireSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = requireSecret(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const operatorId = searchParams.get("operator_id");
  const propertyIdsParam = searchParams.get("property_ids");

  if (!operatorId) {
    return NextResponse.json({ error: "operator_id required" }, { status: 400 });
  }

  const propertyIds = propertyIdsParam
    ? propertyIdsParam.split(",").filter(Boolean)
    : undefined;

  try {
    const stats = await getDashboardStats(operatorId, propertyIds);
    return NextResponse.json({ stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
