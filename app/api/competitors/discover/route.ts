// POST /api/competitors/discover
// Fetches nearby rental listings from Rentcast and returns them for the user to review.
// No AI filtering — user decides what's a competitor.
// Body: { email, property_id }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

interface RentcastListing {
  id: string;
  formattedAddress?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  features?: { amenities?: string[] };
}

async function fetchListings(params: Record<string, string>, apiKey: string): Promise<RentcastListing[]> {
  try {
    const qs = new URLSearchParams({ ...params, limit: "50" });
    const res = await fetch(`${RENTCAST_BASE}/listings/rental/long-term?${qs}`, {
      headers: { "X-Api-Key": apiKey },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.listings ?? []);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, property_id } = body;
  if (!email || !property_id) {
    return NextResponse.json({ error: "email and property_id required" }, { status: 400 });
  }

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rentcastKey = process.env.RENTCAST_API_KEY;
  if (!rentcastKey) return NextResponse.json({ error: "RENTCAST_API_KEY not configured" }, { status: 500 });

  const db = getSupabaseAdmin();

  // Fetch property details
  const { data: property } = await db
    .from("properties")
    .select("id, name, address, city, state, zip")
    .eq("id", property_id)
    .single();

  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  // Fetch real avg rent from units
  const { data: units } = await db
    .from("units")
    .select("monthly_rent")
    .eq("property_id", property_id)
    .not("monthly_rent", "is", null);

  const rents = (units ?? []).map((u: { monthly_rent: number }) => u.monthly_rent).filter(Boolean);
  const avgRent = rents.length > 0
    ? Math.round(rents.reduce((s: number, r: number) => s + r, 0) / rents.length)
    : null;

  // Try zip first, then city+state
  let listings: RentcastListing[] = [];

  if (property.zip) {
    listings = await fetchListings({ zipCode: property.zip }, rentcastKey);
  }

  if (listings.length === 0 && property.city && property.state) {
    listings = await fetchListings({ city: property.city, state: property.state }, rentcastKey);
  }

  if (listings.length === 0) {
    return NextResponse.json({
      error: `No listings found on Rentcast for ${property.zip || property.city}, ${property.state}. You can still add competitors manually.`,
    }, { status: 404 });
  }

  // Light filtering: skip listings with no price, dedupe by address, sort by price proximity
  const seen = new Set<string>();
  const filtered = listings
    .filter(l => {
      if (!l.price || l.price < 200) return false;
      const key = (l.formattedAddress || l.addressLine1 || "").toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (!avgRent) return 0;
      return Math.abs((a.price ?? 0) - avgRent) - Math.abs((b.price ?? 0) - avgRent);
    })
    .slice(0, 20);

  const suggestions = filtered.map(l => {
    const price   = l.price ?? 0;
    const low     = Math.round(price * 0.9);
    const high    = Math.round(price * 1.1);
    const diff    = avgRent ? price - avgRent : 0;
    const threat: "high" | "medium" | "low" =
      Math.abs(diff) <= 100 ? "high" :
      Math.abs(diff) <= 300 ? "medium" : "low";

    return {
      name:          l.formattedAddress || l.addressLine1 || "Unknown",
      address:       l.formattedAddress || l.addressLine1 || "",
      zip_code:      l.zipCode || property.zip || "",
      city:          l.city || property.city || "",
      state:         l.state || property.state || "",
      their_low:     low,
      their_high:    high,
      listed_price:  price,
      bedrooms:      l.bedrooms ?? null,
      bathrooms:     l.bathrooms ?? null,
      threat_level:  threat,
      key_amenities: l.features?.amenities?.slice(0, 5) ?? [],
      property_type: l.propertyType ?? "",
    };
  });

  return NextResponse.json({
    property_name: property.name,
    our_avg_rent:  avgRent,
    found:         listings.length,
    returned:      suggestions.length,
    competitors:   suggestions,
  });
}
