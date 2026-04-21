// POST /api/competitors/discover
// 1. Geocodes the property address via Nominatim (OpenStreetMap, free, no key)
// 2. Searches Rentcast within a 2-mile radius for listings + property records
// 3. Claude analyzes the results and identifies real competitors with commentary
// Body: { email, property_id }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

// ── Geocode via Nominatim ────────────────────────────────────────────────────
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

// ── Rentcast fetch helper ────────────────────────────────────────────────────
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

// ── Types ────────────────────────────────────────────────────────────────────
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
  distance?: number;
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

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const db = getSupabaseAdmin();

  // ── Fetch our property ───────────────────────────────────────────────────
  const { data: property } = await db
    .from("properties")
    .select("id, name, address, city, state, zip, total_units")
    .eq("id", property_id)
    .single();

  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  // ── Our real avg rent from units ─────────────────────────────────────────
  const { data: units } = await db
    .from("units")
    .select("monthly_rent, unit_type, bedrooms")
    .eq("property_id", property_id)
    .not("monthly_rent", "is", null);

  const rents = (units ?? []).map((u: { monthly_rent: number }) => u.monthly_rent).filter(Boolean);
  const avgRent: number | null = rents.length > 0
    ? Math.round(rents.reduce((a: number, b: number) => a + b, 0) / rents.length)
    : null;

  const minRent = rents.length > 0 ? Math.min(...rents) : null;
  const maxRent = rents.length > 0 ? Math.max(...rents) : null;

  // ── Geocode the property address ─────────────────────────────────────────
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

  const latStr = coords.lat.toString();
  const lngStr = coords.lng.toString();

  // ── Rentcast radius search (1.5 miles — catches 1–2 mile draw area) ──────
  const radiusParams: Record<string, string> = {
    latitude:  latStr,
    longitude: lngStr,
    radius:    "1.5",
    limit:     "50",
  };

  const [listingsData, aptData, mfData, marketData] = await Promise.all([
    rentcast("/listings/rental/long-term", radiusParams, rentcastKey),
    rentcast("/properties", { ...radiusParams, propertyType: "Apartment" },   rentcastKey),
    rentcast("/properties", { ...radiusParams, propertyType: "Multifamily" }, rentcastKey),
    rentcast("/markets", property.zip ? { zipCode: property.zip } : { city: property.city ?? "", state: property.state ?? "" }, rentcastKey),
  ]);

  // ── Merge & deduplicate ──────────────────────────────────────────────────
  const allRaw: RawProperty[] = [
    ...(Array.isArray(listingsData) ? listingsData : (listingsData?.listings ?? [])),
    ...(Array.isArray(aptData)      ? aptData      : []),
    ...(Array.isArray(mfData)       ? mfData        : []),
  ];

  const seen = new Set<string>();
  const nearby = allRaw.filter(p => {
    const key = (p.formattedAddress || p.addressLine1 || "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    // skip if it looks like our own property
    if (property.address && key.includes(property.address.toLowerCase().trim().slice(0, 10))) return false;
    seen.add(key);
    return true;
  }).slice(0, 40);

  if (nearby.length === 0) {
    return NextResponse.json({
      error: `No properties found within 1.5 miles of ${property.address}, ${property.city}. Rentcast may not have coverage for this area yet.`,
    }, { status: 404 });
  }

  // ── Claude competitive analysis ──────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const nearbyText = nearby.map((p, i) => {
    const price = p.price ? `$${p.price}/mo` : "rent unknown";
    const beds  = p.bedrooms  != null ? `${p.bedrooms}BR` : "";
    const baths = p.bathrooms != null ? `${p.bathrooms}BA` : "";
    const sqft  = p.squareFootage ? `${p.squareFootage}sf` : "";
    const type  = p.propertyType || "";
    const amen  = p.features?.amenities?.slice(0, 4).join(", ") || "";
    return `${i + 1}. ${p.formattedAddress || p.addressLine1} | ${price} | ${[beds, baths, sqft, type].filter(Boolean).join(" / ")}${amen ? ` | Amenities: ${amen}` : ""}`;
  }).join("\n");

  const prompt = `You are a real estate market analyst. Analyze the rental competitive landscape for our property.

OUR PROPERTY:
- Name: ${property.name}
- Address: ${property.address}, ${property.city}, ${property.state} ${property.zip}
- Units: ${property.total_units ?? "unknown"}
- Avg rent: ${avgRent ? `$${avgRent}/mo` : "unknown"}
- Rent range: ${minRent && maxRent ? `$${minRent}–$${maxRent}/mo` : "unknown"}

NEARBY PROPERTIES WITHIN 1.5 MILES:
${nearbyText}

MARKET DATA (${property.zip || property.city}):
- Market avg rent: ${marketData?.averageRent ? `$${marketData.averageRent}` : "unknown"}
- Market range: ${marketData?.percentile25 && marketData?.percentile75 ? `$${marketData.percentile25}–$${marketData.percentile75}` : "unknown"}

Your task:
1. Identify which of the nearby properties are genuine competitors (would be cross-shopped by the same renters)
2. Exclude: single-family homes, properties priced very far outside our range (>60% difference), commercial properties
3. For each competitor, determine threat level based on price and proximity
4. Write a brief market summary (2-3 sentences) describing the competitive landscape

Return ONLY valid JSON:
{
  "market_summary": "2-3 sentence analysis of the competitive landscape and how our property is positioned",
  "competitors": [
    {
      "index": <original 1-based index from the list above>,
      "name": "property name or formatted address",
      "address": "full address",
      "zip_code": "zip",
      "city": "city",
      "state": "state",
      "their_low": <estimated low rent as integer>,
      "their_high": <estimated high rent as integer>,
      "listed_price": <listed price or best estimate as integer>,
      "bedrooms": <bedrooms or null>,
      "bathrooms": <bathrooms or null>,
      "threat_level": "high" | "medium" | "low",
      "key_amenities": ["amenity"],
      "is_estimated": <true if rent is estimated, false if from listing>,
      "why_competitor": "one sentence on why they compete with us"
    }
  ]
}

Threat level:
- high: within 10% of our avg rent — renters will definitely compare
- medium: within 25% — likely cross-shopped
- low: 25–60% difference — occasional overlap`;

  let marketSummary = "";
  let competitors: {
    index: number;
    name: string;
    address: string;
    zip_code: string;
    city: string;
    state: string;
    their_low: number;
    their_high: number;
    listed_price: number;
    bedrooms: number | null;
    bathrooms: number | null;
    threat_level: "high" | "medium" | "low";
    key_amenities: string[];
    is_estimated: boolean;
    why_competitor: string;
    sqft: number | null;
    property_type: string;
  }[] = [];

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      marketSummary = parsed.market_summary ?? "";
      competitors = (parsed.competitors ?? []).map((c: typeof competitors[number]) => {
        const src = nearby[(c.index ?? 1) - 1] as RawProperty | undefined;
        return {
          ...c,
          sqft:          src?.squareFootage ?? null,
          property_type: src?.propertyType  ?? "",
        };
      });
    }
  } catch {
    // If Claude fails, fall back to raw nearby list with no analysis
    competitors = nearby.slice(0, 15).map((p, i) => ({
      index:         i + 1,
      name:          p.formattedAddress || p.addressLine1 || "Unknown",
      address:       p.formattedAddress || p.addressLine1 || "",
      zip_code:      p.zipCode || property.zip || "",
      city:          p.city    || property.city || "",
      state:         p.state   || property.state || "",
      their_low:     p.price ? Math.round(p.price * 0.9) : (avgRent ?? 1200),
      their_high:    p.price ? Math.round(p.price * 1.1) : (avgRent ?? 1200),
      listed_price:  p.price ?? avgRent ?? 1200,
      bedrooms:      p.bedrooms  ?? null,
      bathrooms:     p.bathrooms ?? null,
      sqft:          p.squareFootage ?? null,
      threat_level:  "medium" as const,
      key_amenities: p.features?.amenities?.slice(0, 4) ?? [],
      is_estimated:  !p.price,
      why_competitor: "",
      property_type: p.propertyType ?? "",
    }));
  }

  return NextResponse.json({
    property_name:  property.name,
    our_avg_rent:   avgRent,
    our_rent_range: minRent && maxRent ? `$${minRent}–$${maxRent}` : null,
    market_summary: marketSummary,
    market_low:     marketData?.percentile25  ? Math.round(marketData.percentile25)  : null,
    market_high:    marketData?.percentile75  ? Math.round(marketData.percentile75)  : null,
    market_avg:     marketData?.averageRent   ? Math.round(marketData.averageRent)   : null,
    coords,
    found:          nearby.length,
    returned:       competitors.length,
    competitors,
  });
}
