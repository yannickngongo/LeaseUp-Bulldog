// GET /api/leads/search?q=...&propertyId=...
// Server-side full-text search across lead name, phone, email, and conversation body.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q          = (searchParams.get("q") ?? "").trim();
  const propertyId = searchParams.get("propertyId");

  if (!q || q.length < 2) {
    return NextResponse.json({ leads: [] });
  }

  const db = getSupabaseAdmin();

  // Build base query — restrict to operator's properties via operator_id
  let query = db
    .from("leads")
    .select("id, name, phone, email, status, source, created_at, property_id, properties!inner(name, operator_id)")
    .eq("properties.operator_id", ctx.operatorId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (propertyId) query = query.eq("property_id", propertyId);

  // Postgres ilike for name/phone/email fuzzy match
  const term = `%${q}%`;
  query = query.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term}`);

  const { data: leads, error } = await query;
  if (error) {
    console.error("[leads/search] query error:", error.message);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  // Also search conversation body — find lead ids that have messages matching the query
  const { data: convMatches } = await db
    .from("conversations")
    .select("lead_id")
    .ilike("body", term)
    .limit(20);

  const convLeadIds = [
    ...new Set((convMatches ?? []).map((c: { lead_id: string }) => c.lead_id)),
  ].filter((lid) => !(leads ?? []).find((l: { id: string }) => l.id === lid));

  let convLeads: typeof leads = [];
  if (convLeadIds.length) {
    let convQuery = db
      .from("leads")
      .select("id, name, phone, email, status, source, created_at, property_id, properties!inner(name, operator_id)")
      .eq("properties.operator_id", ctx.operatorId)
      .in("id", convLeadIds)
      .limit(20);
    if (propertyId) convQuery = convQuery.eq("property_id", propertyId);
    const { data } = await convQuery;
    convLeads = data ?? [];
  }

  const combined = [...(leads ?? []), ...convLeads].slice(0, 50);
  return NextResponse.json({ leads: combined });
}
