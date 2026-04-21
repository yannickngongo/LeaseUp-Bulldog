// GET /api/competitors/sync-all
// Vercel cron — runs weekly (Monday 6am UTC).
// Syncs Rentcast market data for every competitor that has a zip_code.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

async function fetchMarketRents(zipCode: string): Promise<{ low: number; high: number } | null> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `${RENTCAST_BASE}/markets?zipCode=${encodeURIComponent(zipCode)}&propertyType=Apartment`,
      { headers: { "X-Api-Key": apiKey } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const low  = data.percentile25 ?? data.minRent ?? null;
    const high = data.percentile75 ?? data.maxRent ?? null;
    if (!low || !high) return null;
    return { low: Math.round(low), high: Math.round(high) };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data: comps, error } = await db
    .from("competitors")
    .select("id, zip_code, their_low, their_high, operator_id")
    .not("zip_code", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0;
  for (const comp of comps ?? []) {
    if (!comp.zip_code) continue;
    const market = await fetchMarketRents(comp.zip_code);
    if (!market) continue;

    const prevMid = Math.round((comp.their_low + comp.their_high) / 2);
    const newMid  = Math.round((market.low + market.high) / 2);
    const drop    = prevMid - newMid;
    const alert   = drop >= 50 ? `Market rent dropped $${drop} near this competitor since last sync.` : null;

    await db
      .from("competitors")
      .update({
        their_low:   market.low,
        their_high:  market.high,
        last_synced: new Date().toISOString(),
        alert,
        updated_at:  new Date().toISOString(),
      })
      .eq("id", comp.id);

    updated++;
  }

  return NextResponse.json({ ok: true, updated, total: comps?.length ?? 0 });
}
