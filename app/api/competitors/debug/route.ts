// Temporary debug endpoint — checks if the Rentcast listings endpoint is accessible
// GET /api/competitors/debug?zip=79415&bedrooms=1
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zip      = searchParams.get("zip")      ?? "79415";
  const bedrooms = searchParams.get("bedrooms") ?? "1";

  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "no key" });

  // Test 1: listings by zip
  const p1 = new URLSearchParams({ zipCode: zip, bedrooms, limit: "5" });
  const r1 = await fetch(`https://api.rentcast.io/v1/listings/rental/long-term?${p1}`, {
    headers: { "X-Api-Key": apiKey }, next: { revalidate: 0 },
  });
  const t1 = await r1.text();

  // Test 2: AVM keys
  const p2 = new URLSearchParams({ address: `102 Waco Ave, Lubbock, TX, ${zip}`, bedrooms });
  const r2 = await fetch(`https://api.rentcast.io/v1/avm/rent/long-term?${p2}`, {
    headers: { "X-Api-Key": apiKey }, next: { revalidate: 0 },
  });
  const d2 = await r2.json();

  return NextResponse.json({
    listings_status: r1.status,
    listings_response: t1.slice(0, 500),
    avm_keys: Object.keys(d2),
    avm_has_lat: d2.latitude != null,
    avm_lat: d2.latitude,
    avm_lng: d2.longitude,
  });
}
