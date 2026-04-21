// POST /api/competitors/sync
// Syncs rent data for one or all competitors of a property via Rentcast API.
// Body: { email, property_id, competitor_id? }
// Requires RENTCAST_API_KEY env var (https://app.rentcast.io)

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

async function fetchMarketRents(zipCode: string): Promise<{ low: number; high: number; alert: string | null } | null> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `${RENTCAST_BASE}/markets?zipCode=${encodeURIComponent(zipCode)}&propertyType=Apartment`,
      { headers: { "X-Api-Key": apiKey }, next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const low  = data.percentile25 ?? data.minRent ?? null;
    const high = data.percentile75 ?? data.maxRent ?? null;
    if (!low || !high) return null;

    return { low: Math.round(low), high: Math.round(high), alert: null };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, property_id, competitor_id } = body;
  if (!email || !property_id) return NextResponse.json({ error: "email and property_id required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();

  // Fetch competitors to sync (one or all for the property)
  let query = db
    .from("competitors")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .eq("property_id", property_id);

  if (competitor_id) query = query.eq("id", competitor_id);

  const { data: comps, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const toSync = (comps ?? []).filter(c => c.zip_code);
  const results: { id: string; updated: boolean }[] = [];

  for (const comp of toSync) {
    const market = await fetchMarketRents(comp.zip_code);
    if (!market) { results.push({ id: comp.id, updated: false }); continue; }

    // Generate alert if market dropped significantly vs our last reading
    const prevMid = Math.round((comp.their_low + comp.their_high) / 2);
    const newMid  = Math.round((market.low + market.high) / 2);
    const drop    = prevMid - newMid;
    const alert   = drop >= 50 ? `Market rent near ${comp.name} dropped $${drop} since last sync.` : null;

    const { error: updateErr } = await db
      .from("competitors")
      .update({
        their_low:   market.low,
        their_high:  market.high,
        last_synced: new Date().toISOString(),
        alert,
        updated_at:  new Date().toISOString(),
      })
      .eq("id", comp.id)
      .eq("operator_id", ctx.operatorId);

    results.push({ id: comp.id, updated: !updateErr });
  }

  return NextResponse.json({ synced: results.length, results });
}
