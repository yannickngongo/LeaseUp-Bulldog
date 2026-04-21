// POST /api/competitors/discover
// Two-step Rentcast approach that matches what Rentcast's own website shows:
// Step 1: Call /avm/rent/long-term to get lat/lng for the subject property.
// Step 2: Call /listings/rental/long-term with lat/lng + radius to get actual comps.
// Calls once per unique bedroom count in the property's units (max 3).
// Body: { email, property_id }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

interface AvmGeoResponse {
  latitude?:  number;
  longitude?: number;
  rent?:      number;
}

interface RentcastListing {
  id?:               string;
  formattedAddress?: string;
  addressLine1?:     string;
  city?:             string;
  state?:            string;
  zipCode?:          string;
  price?:            number;
  bedrooms?:         number;
  bathrooms?:        number;
  squareFootage?:    number;
  propertyType?:     string;
  latitude?:         number;
  longitude?:        number;
  listedDate?:       string;
  lastSeen?:         string;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getLatLng(
  address: string,
  bedrooms: number,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({ address, bedrooms: bedrooms.toString() });
  try {
    const res = await fetch(`${RENTCAST_BASE}/avm/rent/long-term?${params}`, {
      headers: { "X-Api-Key": apiKey },
      next:    { revalidate: 0 },
    });
    if (!res.ok) {
      console.error(`AVM geo ${res.status}:`, await res.text().catch(() => ""));
      return null;
    }
    const data: AvmGeoResponse = await res.json();
    if (data.latitude == null || data.longitude == null) return null;
    return { lat: data.latitude, lng: data.longitude };
  } catch (e) {
    console.error("getLatLng error:", e);
    return null;
  }
}

async function fetchListings(
  lat: number,
  lng: number,
  bedrooms: number,
  apiKey: string,
  radius = 2
): Promise<RentcastListing[]> {
  const params = new URLSearchParams({
    latitude:  lat.toString(),
    longitude: lng.toString(),
    radius:    radius.toString(),
    bedrooms:  bedrooms.toString(),
    limit:     "50",
    status:    "Active",
  });
  try {
    const res = await fetch(`${RENTCAST_BASE}/listings/rental/long-term?${params}`, {
      headers: { "X-Api-Key": apiKey },
      next:    { revalidate: 0 },
    });
    if (!res.ok) {
      console.error(`Listings ${res.status}:`, await res.text().catch(() => ""));
      return [];
    }
    const data = await res.json();
    const listings = Array.isArray(data) ? data : (data.listings ?? []);
    console.log(`Listings for ${lat},${lng} ${bedrooms}BR → ${listings.length} results`);
    return listings;
  } catch (e) {
    console.error("fetchListings error:", e);
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

  const rentcastKey = process.env.RENTCAST_API_KEY;
  if (!rentcastKey)
    return NextResponse.json({ error: "RENTCAST_API_KEY not configured" }, { status: 500 });

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
  ].slice(0, 3);

  const searchBedrooms = uniqueBedrooms.length > 0 ? uniqueBedrooms : [1, 2];

  const fullAddress = [property.address, property.city, property.state, property.zip]
    .filter(Boolean)
    .join(", ");

  // Step 1: get lat/lng from the first successful AVM call
  let geo: { lat: number; lng: number } | null = null;
  for (const br of searchBedrooms) {
    geo = await getLatLng(fullAddress, br, rentcastKey);
    if (geo) break;
  }

  if (!geo) {
    return NextResponse.json({
      error: `Could not geocode ${property.address}. Make sure the address is complete (street, city, state, zip).`,
    }, { status: 400 });
  }

  // Step 2: fetch listings for each bedroom count in parallel
  const listingArrays = await Promise.all(
    searchBedrooms.map(br => fetchListings(geo!.lat, geo!.lng, br, rentcastKey))
  );

  // Merge, deduplicate by address, skip our own property
  const seen     = new Set<string>();
  const ourSlice = property.address.toLowerCase().slice(0, 12);

  const allListings = listingArrays.flat().filter(l => {
    const addr = (l.formattedAddress ?? l.addressLine1 ?? "").toLowerCase().trim();
    if (!addr || seen.has(addr))    return false;
    if (addr.startsWith(ourSlice)) return false;
    seen.add(addr);
    return true;
  });

  if (allListings.length === 0) {
    return NextResponse.json({
      error: `No active rental listings found within 2 miles of ${property.address}, ${property.city}. Try adding competitors manually.`,
    }, { status: 404 });
  }

  const results = allListings
    .map(l => {
      const distKm =
        l.latitude != null && l.longitude != null
          ? haversineKm(geo!.lat, geo!.lng, l.latitude, l.longitude)
          : null;
      return {
        address:       l.formattedAddress ?? l.addressLine1 ?? "Unknown address",
        city:          l.city             ?? property.city  ?? "",
        state:         l.state            ?? property.state ?? "",
        zip_code:      l.zipCode          ?? property.zip   ?? "",
        price:         l.price            ?? null,
        bedrooms:      l.bedrooms         ?? null,
        bathrooms:     l.bathrooms        ?? null,
        sqft:          l.squareFootage    ?? null,
        property_type: l.propertyType     ?? null,
        distance:      distKm != null ? parseFloat((distKm * 0.621371).toFixed(2)) : null,
        similarity:    null,
        last_seen:     l.lastSeen ?? l.listedDate ?? null,
      };
    })
    .sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));

  return NextResponse.json({
    property_name: property.name,
    search_label:  `${searchBedrooms.join("BR, ")}BR comps · Rentcast`,
    count:         results.length,
    results,
  });
}
