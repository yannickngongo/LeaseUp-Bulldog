// GET /api/analytics/dashboard?operator_id=...&property_ids=id1,id2

import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/analytics";

export async function GET(req: NextRequest) {
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
