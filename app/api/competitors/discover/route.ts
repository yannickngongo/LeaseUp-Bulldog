// POST /api/competitors/discover
// Searches Rentcast property records (not just active listings) for nearby rentals.
// Falls back to market-level data when no specific properties are found.
// Body: { email, property_id }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

async function rentcast(path: string, params: Record<string, string>, apiKey: string) {
  try {
    const qs = new URLSearchParams(params);
    const res = await fetch(`${RENTCAST_BASE}${path}?${qs}`, {
      headers: { "X-Api-Key": apiKey },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, property_id } = body;
  if (!email || !property_id)
    return NextResponse.json({ error: "email and property_id required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "RENTCAST_API_KEY not configured" }, { status: 500 });

  const db = getSupabaseAdmin();

  // Our property details
  const { data: property } = await db
    .from("properties")
    .select("id, name, address, city, state, zip")
    .eq("id", property_id)
    .single();

  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  // Our real avg rent
  const { data: units } = await db
    .from("units")
    .select("monthly_rent")
    .eq("property_id", property_id)
    .not("monthly_rent", "is", null);

  const rents = (units ?? []).map((u: { monthly_rent: number }) => u.monthly_rent).filter(Boolean);
  const avgRent: number | null = rents.length > 0
    ? Math.round(rents.reduce((s: number, r: number) => s + r, 0) / rents.length)
    : null;

  const zip   = property.zip   ?? "";
  const city  = property.city  ?? "";
  const state = property.state ?? "";

  // ── 1. Property records search (much broader than listings) ─────────────────
  // Try multiple property types to maximise results
  const locationParams: Record<string, string> = zip
    ? { zipCode: zip }
    : { city, state };

  const [aptData, mfData, listingsData] = await Promise.all([
    rentcast("/properties", { ...locationParams, propertyType: "Apartment",   limit: "50" }, apiKey),
    rentcast("/properties", { ...locationParams, propertyType: "Multifamily", limit: "50" }, apiKey),
    rentcast("/listings/rental/long-term", { ...locationParams, limit: "50" }, apiKey),
  ]);

  // ── 2. Market rent stats for the area ───────────────────────────────────────
  const marketParams: Record<string, string> = zip ? { zipCode: zip } : { city, state };
  const marketData = await rentcast("/markets", marketParams, apiKey);

  const marketLow  = marketData?.percentile25 ?? marketData?.minRent ?? null;
  const marketHigh = marketData?.percentile75 ?? marketData?.maxRent ?? null;
  const marketAvg  = marketData?.averageRent  ?? null;

  // ── 3. Merge and deduplicate all sources ────────────────────────────────────
  type RawProp = {
    id?: string;
    formattedAddress?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    propertyType?: string;
    features?: { amenities?: string[] };
    lastSalePrice?: number;
  };

  const allRaw: RawProp[] = [
    ...(Array.isArray(aptData)      ? aptData      : []),
    ...(Array.isArray(mfData)       ? mfData        : []),
    ...(Array.isArray(listingsData) ? listingsData  : (listingsData?.listings ?? [])),
  ];

  const seen  = new Set<string>();
  const props = allRaw.filter(p => {
    const addr = (p.formattedAddress || p.addressLine1 || "").toLowerCase().trim();
    if (!addr || seen.has(addr)) return false;
    seen.add(addr);
    return true;
  });

  // ── 4. Build competitor suggestions ─────────────────────────────────────────
  const suggestions = props.slice(0, 25).map((p: RawProp) => {
    // Estimate rent: use listing price if available, else interpolate from market data
    const listedPrice = p.price ?? null;
    const estimatedRent = listedPrice ?? marketAvg ?? avgRent ?? 1200;
    const low  = Math.round(estimatedPrice(estimatedRent, 0.90));
    const high = Math.round(estimatedPrice(estimatedRent, 1.10));
    const diff = avgRent ? estimatedRent - avgRent : null;

    const threat: "high" | "medium" | "low" =
      diff === null       ? "medium" :
      Math.abs(diff) <= 100 ? "high" :
      Math.abs(diff) <= 300 ? "medium" : "low";

    return {
      name:          p.formattedAddress || p.addressLine1 || "Unknown address",
      address:       p.formattedAddress || p.addressLine1 || "",
      zip_code:      p.zipCode || zip,
      city:          p.city    || city,
      state:         p.state   || state,
      their_low:     low,
      their_high:    high,
      listed_price:  estimatedRent,
      is_estimated:  !listedPrice,
      bedrooms:      p.bedrooms  ?? null,
      bathrooms:     p.bathrooms ?? null,
      sqft:          p.squareFootage ?? null,
      threat_level:  threat,
      key_amenities: p.features?.amenities?.slice(0, 5) ?? [],
      property_type: p.propertyType ?? "",
    };
  });

  // Sort: closest rent to ours first
  if (avgRent) {
    suggestions.sort((a, b) =>
      Math.abs(a.listed_price - avgRent) - Math.abs(b.listed_price - avgRent)
    );
  }

  if (suggestions.length === 0) {
    return NextResponse.json({
      error: `Rentcast returned no property records for ${zip || city}, ${state}. This market may not be in their database yet. Add competitors manually.`,
    }, { status: 404 });
  }

  return NextResponse.json({
    property_name: property.name,
    our_avg_rent:  avgRent,
    market_low:    marketLow  ? Math.round(marketLow)  : null,
    market_high:   marketHigh ? Math.round(marketHigh) : null,
    found:         allRaw.length,
    returned:      suggestions.length,
    competitors:   suggestions,
  });
}

function estimatedPrice(base: number, factor: number) {
  return Math.round(base * factor);
}
