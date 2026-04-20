// GET /api/insights?email=... — aggregated portfolio analytics

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db = getSupabaseAdmin();

  const { data: op } = await db
    .from("operators")
    .select("id, name")
    .eq("email", email)
    .single();
  if (!op) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: properties } = await db
    .from("properties")
    .select("id, name, city, state, total_units, occupied_units")
    .eq("operator_id", op.id);

  const propIds = (properties ?? []).map((p) => p.id);

  const [{ data: leads }, { data: units }, { data: activity }] = await Promise.all([
    propIds.length > 0
      ? db.from("leads").select("id, status, source, created_at, property_id").in("property_id", propIds)
      : { data: [] },
    propIds.length > 0
      ? db.from("units").select("property_id, status, monthly_rent, unit_type").in("property_id", propIds)
      : { data: [] },
    db
      .from("activity_logs")
      .select("id, action, actor, created_at")
      .eq("operator_id", op.id)
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  // Weekly lead volume — last 12 weeks
  const now = Date.now();
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = now - (11 - i) * 7 * 86400000;
    const end   = now - (10 - i) * 7 * 86400000;
    return {
      label: new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: (leads ?? []).filter((l) => {
        const t = new Date(l.created_at).getTime();
        return t >= start && t < end;
      }).length,
    };
  });

  // Lead source breakdown
  const sourceMap: Record<string, number> = {};
  for (const l of leads ?? []) {
    const src = l.source || "Direct";
    sourceMap[src] = (sourceMap[src] ?? 0) + 1;
  }
  const sources = Object.entries(sourceMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Conversion funnel (cumulative — everyone who reached this stage or beyond)
  const STAGES = ["new", "contacted", "engaged", "tour_scheduled", "applied", "won"] as const;
  const allLeads = leads ?? [];
  const funnel = STAGES.map((status) => ({
    status,
    count: allLeads.filter((l) =>
      STAGES.indexOf(l.status as typeof STAGES[number]) >= STAGES.indexOf(status) ||
      l.status === "won"
    ).length,
  }));

  // Revenue estimate
  const occupiedUnits = (units ?? []).filter((u) => u.status === "occupied");
  const estimatedRevenue = occupiedUnits.reduce((s, u) => s + (u.monthly_rent ?? 0), 0);

  // Portfolio totals
  const totalUnits    = (properties ?? []).reduce((s, p) => s + (p.total_units    ?? 0), 0);
  const occupiedCount = (properties ?? []).reduce((s, p) => s + (p.occupied_units ?? 0), 0);
  const portfolioOccPct = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : null;

  // Unit mix
  const unitMix: Record<string, number> = {};
  for (const u of units ?? []) {
    const t = u.unit_type ?? "unknown";
    unitMix[t] = (unitMix[t] ?? 0) + 1;
  }

  // AI activity stats (last 30 days)
  const aiReplies   = (activity ?? []).filter((a) => a.action === "sms_sent" && a.actor === "ai").length;
  const humanTakes  = (activity ?? []).filter((a) => a.action === "human_takeover").length;
  const toursBooked = (activity ?? []).filter((a) => a.action === "tour_scheduled").length;

  return NextResponse.json({
    ok: true,
    weeks,
    sources,
    funnel,
    estimatedRevenue,
    totalUnits,
    occupiedCount,
    portfolioOccPct,
    unitMix,
    aiReplies,
    humanTakes,
    toursBooked,
    totalLeads:  allLeads.length,
    activeLeads: allLeads.filter((l) => !["won", "lost"].includes(l.status)).length,
    wonLeads:    allLeads.filter((l) => l.status === "won").length,
    lostLeads:   allLeads.filter((l) => l.status === "lost").length,
    properties:  properties ?? [],
  });
}
