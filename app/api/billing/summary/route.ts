// GET /api/billing/summary?operator_id=...&month=YYYY-MM
// Returns monthly performance summary + billing period breakdown.
// Requires Authorization: Bearer <CRON_SECRET> — internal/admin use only.

import { NextRequest, NextResponse } from "next/server";
import {
  getOperatorMonthlySummary,
  getPerformanceFeesByProperty,
  generateBillingPeriod,
} from "@/lib/billing";

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
  const month = searchParams.get("month"); // 'YYYY-MM', defaults to current month

  if (!operatorId) {
    return NextResponse.json({ error: "operator_id required" }, { status: 400 });
  }

  const billingMonth = month ?? new Date().toISOString().slice(0, 7);

  try {
    const [summary, byProperty] = await Promise.all([
      getOperatorMonthlySummary(operatorId, billingMonth),
      getPerformanceFeesByProperty(operatorId, billingMonth),
    ]);

    return NextResponse.json({ summary, byProperty, billingMonth });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/billing/summary — generate/refresh a billing period snapshot
export async function POST(req: NextRequest) {
  const denied = requireSecret(req);
  if (denied) return denied;

  const body = await req.json();
  const { operator_id, period_start, period_end } = body;

  if (!operator_id || !period_start || !period_end) {
    return NextResponse.json({ error: "operator_id, period_start, period_end required" }, { status: 400 });
  }

  try {
    const period = await generateBillingPeriod(
      operator_id,
      new Date(period_start),
      new Date(period_end)
    );
    return NextResponse.json({ period });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
