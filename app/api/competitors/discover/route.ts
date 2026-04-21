// POST /api/competitors/discover
// Uses Rentometer /api/v1/nearby_comps to return individual rental comps near the property.
// Calls for each unique bedroom count found in the property's units (fallback: 1BR + 2BR).
// Body: { email, property_id }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

const RENTOMETER_BASE = "https://www.rentometer.com/api/v1";

interface RentometerComp {
  address?:       string;
  latitude?:      number;
  longitude?:     number;
  distance?:      number;
  price?:         number;
  bedrooms?:      number;
  baths?:         string;
  property_type?: string;
  last_seen?:     string;
  sqft?:          number;
}

async function fetchNearbyComps(
  address: string,
  bedrooms: number,
  apiKey: string
): Promise<RentometerComp[]> {
  const params = new URLSearchParams({
    api_key:  apiKey,
    address,
    bedrooms: bedrooms.toString(),
  });
  try {
    const res = await fetch(`${RENTOMETER_BASE}/nearby_comps?${params}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.nearby_properties) ? data.nearby_properties : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, property_id } = body;
  if (!email || !property_id)
    return NextResponse.json({ error: "email and property_id required" }, { status: 400 });

  const ctx = await resolveCallerContext(email);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rentometerKey = process.env.RENTOMETER_API_KEY;
  if (!rentometerKey)
    return NextResponse.json({ error: "RENTOMETER_API_KEY not configured" }, { status: 500 });

  const db = getSupabaseAdmin();

  const { data: property } = await db
    .from("properties")
    .select("id, name, address, city, state, zip")
    .eq("id", property_id)
    .single();

  if (!property)
    return NextResponse.json({ error: "Property not found" }, { status: 404 });

  if (!property.address)
    return NextResponse.json({
      error: `${property.name} has no street address saved. Add a full address in Properties → Edit before running discovery.`,
    }, { status: 400 });

  // Determine which bedroom counts to search for based on this property's actual units
  const { data: units } = await db
    .from("units")
    .select("bedrooms")
    .eq("property_id", property_id)
    .not("bedrooms", "is", null);

  const uniqueBedrooms = [
    ...new Set(
      (units ?? [])
        .map((u: { bedrooms: number | null }) => u.bedrooms)
        .filter((b): b is number => b != null && b >= 0)
    ),
  ].slice(0, 3); // cap at 3 API calls

  const searchBedrooms = uniqueBedrooms.length > 0 ? uniqueBedrooms : [1, 2];

  const fullAddress = [property.address, property.city, property.state, property.zip]
    .filter(Boolean)
    .join(", ");

  // Fetch comps for each bedroom count in parallel
  const compArrays = await Promise.all(
    searchBedrooms.map(br => fetchNearbyComps(fullAddress, br, rentometerKey))
  );

  // Merge, deduplicate by address, skip our own property
  const seen     = new Set<string>();
  const ourSlice = property.address.toLowerCase().slice(0, 12);

  const allComps = compArrays.flat().filter(c => {
    const key = (c.address ?? "").toLowerCase().trim();
    if (!key || seen.has(key))         return false;
    if (key.startsWith(ourSlice))      return false;
    seen.add(key);
    return true;
  });

  if (allComps.length === 0) {
    return NextResponse.json({
      error: `No rental comps found near ${property.address}, ${property.city}. Rentometer may not have coverage for this area — try adding competitors manually.`,
    }, { status: 404 });
  }

  // Map to the shape the UI expects, sorted by distance
  const results = allComps
    .map(c => {
      // baths comes as "1" or "1.5+" — parse to number
      const bathsNum = c.baths ? (parseFloat(c.baths.replace("+", "")) || null) : null;
      return {
        address:       c.address       ?? "Unknown address",
        city:          property.city   ?? "",
        state:         property.state  ?? "",
        zip_code:      property.zip    ?? "",
        price:         c.price         ?? null,
        bedrooms:      c.bedrooms      ?? null,
        bathrooms:     bathsNum,
        sqft:          c.sqft          ?? null,
        property_type: c.property_type ?? null,
        distance:      c.distance      ?? null,
        similarity:    null,
        last_seen:     c.last_seen     ?? null,
      };
    })
    .sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));

  return NextResponse.json({
    property_name: property.name,
    search_label:  `${searchBedrooms.join("BR, ")}BR comps · Rentometer`,
    count:         results.length,
    results,
  });
}
