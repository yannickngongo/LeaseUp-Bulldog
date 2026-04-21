// POST /api/competitors/discover
// Uses Rentcast's AVM comparables endpoint — the same data Rentcast's own UI shows
// when you search a property address. Falls back to radius search if AVM returns nothing.
// Body: { email, property_id }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

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

interface Comparable {
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
  distance?: number;
  daysOnMarket?: number;
  listedDate?: string;
  removedDate?: string;
  lastSeenDate?: string;
  similarity?: number;
  correlationScore?: number;
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

  if (!property.address) {
    return NextResponse.json({
      error: `${property.name} has no street address saved. Add a full address in Properties → Edit before running discovery.`,
    }, { status: 400 });
  }

  // ── Primary: AVM comparables — exactly what Rentcast's UI shows ─────────────
  const avmParams: Record<string, string> = {
    address: property.address,
    ...(property.city  ? { city:    property.city  } : {}),
    ...(property.state ? { state:   property.state } : {}),
    ...(property.zip   ? { zipCode: property.zip   } : {}),
    radius:  "1.5",
    limit:   "25",
  };

  let comparables: Comparable[] = [];
  let searchLabel = "AVM comparables · 1.5-mile radius";

  const avmData = await rentcast("/avm/rent/long-term", avmParams, rentcastKey);
  if (avmData?.comparables?.length) {
    comparables = avmData.comparables;
  }

  // ── Fallback: widen AVM radius ───────────────────────────────────────────────
  if (comparables.length === 0) {
    for (const radius of ["3", "5"]) {
      const data = await rentcast("/avm/rent/long-term", { ...avmParams, radius, limit: "25" }, rentcastKey);
      if (data?.comparables?.length) {
        comparables = data.comparables;
        searchLabel = `AVM comparables · ${radius}-mile radius`;
        break;
      }
    }
  }

  // ── Fallback: listings radius search ────────────────────────────────────────
  if (comparables.length === 0 && property.zip) {
    const listingsData = await rentcast("/listings/rental/long-term", { zipCode: property.zip, limit: "50" }, rentcastKey);
    const raw: Comparable[] = Array.isArray(listingsData) ? listingsData : (listingsData?.listings ?? []);
    if (raw.length) { comparables = raw; searchLabel = `Active listings · ZIP ${property.zip}`; }
  }

  if (comparables.length === 0) {
    return NextResponse.json({
      error: `Rentcast has no rental data for ${property.address}, ${property.city}. Try adding competitors manually.`,
    }, { status: 404 });
  }

  // Skip our own property address
  const ourPrefix = property.address.toLowerCase().slice(0, 12);
  const results = comparables
    .filter(c => {
      const addr = (c.formattedAddress || c.addressLine1 || "").toLowerCase();
      return addr && !addr.startsWith(ourPrefix);
    })
    .map(c => ({
      address:       c.formattedAddress || c.addressLine1 || "Unknown address",
      city:          c.city     ?? property.city  ?? "",
      state:         c.state    ?? property.state ?? "",
      zip_code:      c.zipCode  ?? property.zip   ?? "",
      price:         c.price    ?? null,
      bedrooms:      c.bedrooms      ?? null,
      bathrooms:     c.bathrooms     ?? null,
      sqft:          c.squareFootage ?? null,
      property_type: c.propertyType  ?? null,
      distance:      c.distance      ?? null,
      similarity:    c.similarity != null ? Math.round(c.similarity * 10) / 10 : null,
      last_seen:     c.lastSeenDate  ?? c.listedDate ?? null,
    }));

  return NextResponse.json({
    property_name: property.name,
    search_label:  searchLabel,
    count: results.length,
    results,
  });
}
