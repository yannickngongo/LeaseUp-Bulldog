// POST /api/competitors/discover
// Uses Rentcast /avm/rent/long-term to return the comparable listings Rentcast
// already surfaces on their own website for any given address.
// Calls once per unique bedroom count found in the property's units (max 3).
// Body: { email, property_id }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

interface RentcastComp {
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
  distance?:         number;
  similarity?:       number;
  lastSeen?:         string;
}

async function fetchComps(
  address: string,
  bedrooms: number,
  apiKey: string
): Promise<RentcastComp[]> {
  const params = new URLSearchParams({
    address,
    bedrooms:  bedrooms.toString(),
    compCount: "25",
  });
  try {
    const res = await fetch(`${RENTCAST_BASE}/avm/rent/long-term?${params}`, {
      headers: { "X-Api-Key": apiKey },
      next:    { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.comparables) ? data.comparables : [];
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

  // Determine which bedroom counts to search based on this property's actual units
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

  // Fetch comps for each bedroom count in parallel
  const compArrays = await Promise.all(
    searchBedrooms.map(br => fetchComps(fullAddress, br, rentcastKey))
  );

  // Merge, deduplicate by address, skip our own property
  const seen     = new Set<string>();
  const ourSlice = property.address.toLowerCase().slice(0, 12);

  const allComps = compArrays.flat().filter(c => {
    const addr = (c.formattedAddress ?? c.addressLine1 ?? "").toLowerCase().trim();
    if (!addr || seen.has(addr))    return false;
    if (addr.startsWith(ourSlice)) return false;
    seen.add(addr);
    return true;
  });

  if (allComps.length === 0) {
    return NextResponse.json({
      error: `No rental comps found near ${property.address}, ${property.city}. Rentcast may not have comparable listings for this area — try adding competitors manually.`,
    }, { status: 404 });
  }

  const results = allComps
    .map(c => ({
      address:       c.formattedAddress ?? c.addressLine1 ?? "Unknown address",
      city:          c.city             ?? property.city  ?? "",
      state:         c.state            ?? property.state ?? "",
      zip_code:      c.zipCode          ?? property.zip   ?? "",
      price:         c.price            ?? null,
      bedrooms:      c.bedrooms         ?? null,
      bathrooms:     c.bathrooms        ?? null,
      sqft:          c.squareFootage    ?? null,
      property_type: c.propertyType     ?? null,
      distance:      c.distance         ?? null,
      similarity:    c.similarity != null ? Math.round(c.similarity * 100) : null,
      last_seen:     c.lastSeen         ?? null,
    }))
    .sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));

  return NextResponse.json({
    property_name: property.name,
    search_label:  `${searchBedrooms.join("BR, ")}BR comps · Rentcast`,
    count:         results.length,
    results,
  });
}
