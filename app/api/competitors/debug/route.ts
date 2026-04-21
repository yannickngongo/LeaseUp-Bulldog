import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "no key configured" });

  const p1 = new URLSearchParams({ zipCode: "79415", bedrooms: "1", limit: "3" });
  const r1 = await fetch(`https://api.rentcast.io/v1/listings/rental/long-term?${p1}`, {
    headers: { "X-Api-Key": apiKey }, next: { revalidate: 0 },
  });
  const t1 = await r1.text();

  const p2 = new URLSearchParams({ address: "102 Waco Ave, Lubbock, TX, 79415", bedrooms: "1" });
  const r2 = await fetch(`https://api.rentcast.io/v1/avm/rent/long-term?${p2}`, {
    headers: { "X-Api-Key": apiKey }, next: { revalidate: 0 },
  });
  const t2 = await r2.text();

  return NextResponse.json({
    key_prefix: apiKey.slice(0, 8) + "...",
    listings_status: r1.status,
    listings_body: t1.slice(0, 400),
    avm_status: r2.status,
    avm_body: t2.slice(0, 400),
  });
}
