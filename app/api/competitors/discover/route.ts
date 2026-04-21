// POST /api/competitors/discover
// Searches Rentcast for nearby rental listings, then uses Claude to identify
// which are true competitors for a given property.
// Body: { email, property_id }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

interface RentcastListing {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage?: number;
  propertyType: string;
  features?: { amenities?: string[] };
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

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const db = getSupabaseAdmin();

  // Fetch our property details
  const { data: property } = await db
    .from("properties")
    .select("id, name, address, city, state, zip, total_units, occupied_units")
    .eq("id", property_id)
    .single();

  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  // Fetch real avg rent from units
  const { data: units } = await db
    .from("units")
    .select("monthly_rent, unit_type, properties!inner(operator_id)")
    .eq("property_id", property_id)
    .not("monthly_rent", "is", null);

  const rents = (units ?? []).map(u => u.monthly_rent).filter(Boolean);
  const avgRent = rents.length > 0 ? Math.round(rents.reduce((s: number, r: number) => s + r, 0) / rents.length) : null;

  if (!avgRent) {
    return NextResponse.json({ error: "No unit rent data for this property. Add units with monthly rent first." }, { status: 400 });
  }

  // Search Rentcast for nearby rentals
  const searchParams = new URLSearchParams({
    ...(property.zip ? { zipCode: property.zip } : { city: property.city, state: property.state }),
    limit: "40",
    propertyType: "Apartment",
  });

  let listings: RentcastListing[] = [];
  try {
    const res = await fetch(`${RENTCAST_BASE}/listings/rental/long-term?${searchParams}`, {
      headers: { "X-Api-Key": rentcastKey },
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const data = await res.json();
      listings = Array.isArray(data) ? data : (data.listings ?? []);
    }
  } catch {
    // fall through with empty listings
  }

  if (listings.length === 0) {
    return NextResponse.json({ error: "No nearby rentals found in Rentcast for this location. Try adding competitors manually." }, { status: 404 });
  }

  // Ask Claude to identify true competitors
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const listingsSummary = listings.slice(0, 30).map((l, i) =>
    `${i + 1}. "${l.formattedAddress || l.addressLine1}" | $${l.price}/mo | ${l.bedrooms}BR/${l.bathrooms}BA | ZIP ${l.zipCode} | Amenities: ${l.features?.amenities?.join(", ") || "none listed"}`
  ).join("\n");

  const prompt = `You are a real estate market analyst. Identify which of the following rental listings are genuine competitors to our property.

OUR PROPERTY:
- Name: ${property.name}
- Location: ${property.address || ""}, ${property.city}, ${property.state} ${property.zip || ""}
- Average rent: $${avgRent}/mo
- Total units: ${property.total_units ?? "unknown"}

NEARBY RENTALS FROM RENTCAST:
${listingsSummary}

A true competitor is a property that:
1. Targets the same renter demographic (similar price tier — within ~30% of our avg rent)
2. Is geographically close enough to be in the same consideration set for a renter
3. Has similar unit types (apartments/multifamily — not single-family homes)
4. Would realistically be cross-shopped against our property

Exclude: single-family rentals, properties priced far outside our range, likely the same property under a different name.

Return ONLY valid JSON, no commentary:
{
  "competitors": [
    {
      "name": "Property name or address if no name",
      "address": "full street address",
      "zip_code": "zip code",
      "city": "city",
      "state": "state",
      "their_low": <lowest price in the listing or estimated low based on price>,
      "their_high": <highest price or estimated high>,
      "threat_level": "high" | "medium" | "low",
      "key_amenities": ["amenity1", "amenity2"],
      "reason": "1 sentence explaining why this is a competitor"
    }
  ]
}

threat_level guidance:
- high: priced below us or within 5% — active pricing threat
- medium: priced similarly, comparable amenities
- low: priced higher than us or fewer amenities

Return 3–8 competitors maximum. Only include genuine competitors.`;

  let suggestedCompetitors: {
    name: string;
    address: string;
    zip_code: string;
    city: string;
    state: string;
    their_low: number;
    their_high: number;
    threat_level: "high" | "medium" | "low";
    key_amenities: string[];
    reason: string;
  }[] = [];

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      suggestedCompetitors = parsed.competitors ?? [];
    }
  } catch {
    return NextResponse.json({ error: "AI analysis failed. Try again." }, { status: 500 });
  }

  return NextResponse.json({
    property_name: property.name,
    our_avg_rent: avgRent,
    found: listings.length,
    competitors: suggestedCompetitors,
  });
}
