// POST /api/competitors/discover
// Geocodes the property address, then searches Rentcast within 1.5 miles.
// Returns raw results — no AI filtering, caller decides what's a competitor.
// Body: { email, property_id }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

async function geocode(address: string, city: string, state: string, zip: string): Promise<{ lat: number; lng: number } | null> {
  const q = [address, city, state, zip].filter(Boolean).join(", ");
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { "User-Agent": "LeaseUpBulldog/1.0" }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function rentcast(path: string, params: Record<string, string>, apiKey: string) {
  try {
    const res = await fetch(`${RENTCAST_BASE}${path}?${new URLSearchParams(params)}`, {
      headers: { "X-Api-Key": apiKey },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface RawProperty {
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
  latitude?: number;
  longitude?: number;
  features?: { amenities?: string[] };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, property_id } = body;
  if (!email || !property_id)
    return NextResponse.json({ error: "email and property_id required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rentcastKey = process.env.RENTCAST_API_KEY;
  if (!rentcastKey) return NextResponse.json({ error: "RENTCAST_API_KEY not configured" }, { status: 500 });

  const db = getSupabaseAdmin();

  const { data: property } = await db
    .from("properties")
    .select("id, name, address, city, state, zip")
    .eq("id", property_id)
    .single();

  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const coords = await geocode(
    property.address ?? "",
    property.city    ?? "",
    property.state   ?? "",
    property.zip     ?? ""
  );

  if (!coords) {
    return NextResponse.json({
      error: `Could not geocode address for ${property.name}. Make sure the property has a full street address saved.`,
    }, { status: 400 });
  }

  const radiusParams: Record<string, string> = {
    latitude:  coords.lat.toString(),
    longitude: coords.lng.toString(),
    radius:    "1.5",
    limit:     "50",
  };

  const [listingsData, aptData, mfData] = await Promise.all([
    rentcast("/listings/rental/long-term", radiusParams, rentcastKey),
    rentcast("/properties", { ...radiusParams, propertyType: "Apartment" },   rentcastKey),
    rentcast("/properties", { ...radiusParams, propertyType: "Multifamily" }, rentcastKey),
  ]);

  const allRaw: RawProperty[] = [
    ...(Array.isArray(listingsData) ? listingsData : (listingsData?.listings ?? [])),
    ...(Array.isArray(aptData)      ? aptData      : []),
    ...(Array.isArray(mfData)       ? mfData       : []),
  ];

  // Deduplicate by address, skip our own property
  const seen = new Set<string>();
  const results = allRaw
    .filter(p => {
      const key = (p.formattedAddress || p.addressLine1 || "").toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      if (property.address && key.includes(property.address.toLowerCase().slice(0, 10))) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40)
    .map(p => ({
      address:       p.formattedAddress || p.addressLine1 || "Unknown address",
      city:          p.city    ?? property.city    ?? "",
      state:         p.state   ?? property.state   ?? "",
      zip_code:      p.zipCode ?? property.zip     ?? "",
      price:         p.price   ?? null,
      bedrooms:      p.bedrooms      ?? null,
      bathrooms:     p.bathrooms     ?? null,
      sqft:          p.squareFootage ?? null,
      property_type: p.propertyType  ?? null,
      amenities:     p.features?.amenities?.slice(0, 6) ?? [],
    }));

  if (results.length === 0) {
    return NextResponse.json({
      error: `No properties found within 1.5 miles of ${property.address}, ${property.city}. Rentcast may not have coverage for this area.`,
    }, { status: 404 });
  }

  return NextResponse.json({
    property_name: property.name,
    coords,
    count: results.length,
    results,
  });
}
