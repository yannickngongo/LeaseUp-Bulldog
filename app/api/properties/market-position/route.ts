// POST /api/properties/market-position
// Uses Rentcast AVM (/avm/rent/long-term) to get real market rent estimates per bedroom type.
// Calls the AVM once per unique bedroom count found in the property's units.
// Falls back to a clear error rather than hallucinating numbers.

import { NextRequest, NextResponse } from "next/server";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

interface UnitRentData {
  unit_type: string;
  bedrooms: number;
  count: number;
  avg_rent: number | null;
}

interface AvmResponse {
  rent?: number;
  rentRangeLow?: number;
  rentRangeHigh?: number;
}

async function fetchAvm(
  address: string,
  bedrooms: number,
  apiKey: string
): Promise<AvmResponse | null> {
  const params = new URLSearchParams({ address, bedrooms: bedrooms.toString() });
  try {
    const res = await fetch(`${RENTCAST_BASE}/avm/rent/long-term?${params}`, {
      headers: { "X-Api-Key": apiKey },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { property_name, address, city, state, zip, unit_rents } = body as {
    property_name: string;
    address: string;
    city: string;
    state: string;
    zip?: string;
    unit_rents: UnitRentData[];
  };

  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RENTCAST_API_KEY not configured" }, { status: 500 });
  }

  if (!address) {
    return NextResponse.json({ error: `${property_name} has no street address saved. Add one in Properties → Edit.` }, { status: 400 });
  }

  const fullAddress = [address, city, state, zip].filter(Boolean).join(", ");

  // Call AVM for each bedroom type in parallel
  const results = await Promise.all(
    unit_rents.map(async (u) => {
      const avm = await fetchAvm(fullAddress, u.bedrooms, apiKey);
      return { unit: u, avm };
    })
  );

  // Check if every AVM call came back empty
  const anyData = results.some(r => r.avm?.rent != null);
  if (!anyData) {
    return NextResponse.json({
      error: `Rentcast doesn't have AVM coverage for ${city}, ${state} yet. This is a Rentcast data gap — not all markets are supported.`,
    }, { status: 404 });
  }

  const benchmarks = results
    .filter(r => r.avm?.rent != null)
    .map(r => {
      const { unit, avm } = r;
      const marketAvg    = avm!.rent!;
      const marketLow    = avm!.rentRangeLow  ?? Math.round(marketAvg * 0.9);
      const marketHigh   = avm!.rentRangeHigh ?? Math.round(marketAvg * 1.1);
      const propertyRent = unit.avg_rent;

      let vsMarketPct: number | null = null;
      let recommendation = "No property rent on file to compare.";

      if (propertyRent != null) {
        vsMarketPct = parseFloat((((propertyRent - marketAvg) / marketAvg) * 100).toFixed(1));
        if (vsMarketPct < -5)        recommendation = `${Math.abs(vsMarketPct)}% below market — consider raising rent by $${Math.round(marketAvg - propertyRent)}/mo.`;
        else if (vsMarketPct > 5)    recommendation = `${vsMarketPct}% above market — hold or improve amenity positioning to justify premium.`;
        else                          recommendation = "At market rate — hold and monitor. Good competitive position.";
      }

      return {
        unit_type:       unit.unit_type,
        bedrooms:        unit.bedrooms,
        market_avg_rent: marketAvg,
        market_low:      marketLow,
        market_high:     marketHigh,
        property_rent:   propertyRent,
        vs_market_pct:   vsMarketPct,
        recommendation,
      };
    });

  return NextResponse.json({ ok: true, source: "Rentcast AVM", city, state, benchmarks });
}
