// GET /api/activity-log?action=&actor=&since=&before=&page=
// Returns paginated, filterable activity_logs for the operator's properties.
// Tenant-scoped: only logs for properties the operator owns are returned.

import { NextRequest, NextResponse } from "next/server";
import { resolveCallerContext } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const actor  = searchParams.get("actor");
  const since  = searchParams.get("since");
  const before = searchParams.get("before");
  const page   = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);

  const db = getSupabaseAdmin();

  // Get all property IDs for this operator (tenant scope)
  const { data: properties } = await db
    .from("properties")
    .select("id")
    .eq("operator_id", ctx.operatorId);

  const propertyIds = (properties ?? []).map(p => p.id);

  // Sentinel UUID used for system-wide events (auth failures, billing webhooks, etc.)
  // We include those for this operator only via their email in metadata.
  const sentinelId = "00000000-0000-0000-0000-000000000000";

  let query = db
    .from("activity_logs")
    .select("id, action, actor, lead_id, property_id, metadata, created_at", { count: "exact" })
    .in("property_id", [...propertyIds, sentinelId])
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (action) query = query.ilike("action", `%${action}%`);
  if (actor)  query = query.eq("actor", actor);
  if (since)  query = query.gte("created_at", since);
  if (before) query = query.lt("created_at",  before);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For sentinel-property rows, only include those whose metadata mentions our operator
  const opEmail = ctx.email.toLowerCase();
  const filtered = (data ?? []).filter(row => {
    if (row.property_id !== sentinelId) return true;
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const operator = (meta.operator as string | undefined)?.toLowerCase();
    return operator === opEmail;
  });

  return NextResponse.json({
    logs:       filtered,
    page,
    pageSize:   PAGE_SIZE,
    total:      count ?? 0,
    hasMore:    (count ?? 0) > (page + 1) * PAGE_SIZE,
  });
}
