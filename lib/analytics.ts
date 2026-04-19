// Dashboard analytics aggregation.
// All queries respect operator_id scoping — never cross-tenant.

import { getSupabaseAdmin } from "@/lib/supabase";
import type { DashboardStats } from "@/lib/types";

// ─── getDashboardStats ────────────────────────────────────────────────────────
// Returns aggregated stats for an operator, optionally filtered to specific properties.

export async function getDashboardStats(
  operatorId: string,
  propertyIds?: string[]
): Promise<DashboardStats> {
  const db = getSupabaseAdmin();

  // Build property ID filter
  const propFilter = propertyIds?.length ? propertyIds : null;

  // Run all queries in parallel
  const [
    leasesResult,
    feesResult,
    leadsResult,
    toursResult,
    applicationsResult,
    responseTimeResult,
  ] = await Promise.all([
    // Leases attributed to LUB
    db.from("leases")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", operatorId)
      .eq("is_billable", true)
      .then(r => propFilter
        ? db.from("leases").select("id", { count: "exact", head: true })
            .eq("operator_id", operatorId).eq("is_billable", true).in("property_id", propFilter)
        : r),

    // Performance fees total
    db.from("performance_fees")
      .select("amount")
      .eq("operator_id", operatorId)
      .then(async r => {
        if (propFilter) {
          return db.from("performance_fees").select("amount")
            .eq("operator_id", operatorId).in("property_id", propFilter);
        }
        return r;
      }),

    // Lead stats
    buildLeadsQuery(db, operatorId, propFilter),

    // Tours booked
    db.from("tours")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled")
      .then(async r => {
        if (propFilter) {
          return db.from("tours").select("id", { count: "exact", head: true })
            .in("property_id", propFilter);
        }
        return buildToursQuery(db, operatorId, propFilter);
      }),

    // Application starts
    buildApplicationsQuery(db, operatorId, propFilter),

    // Average response time
    buildResponseTimeQuery(db, operatorId, propFilter),
  ]);

  const leasesAttributed = (await leasesResult).count ?? 0;

  const feesData = (await feesResult).data ?? [];
  const performanceFeesCents = feesData.reduce(
    (sum: number, f: { amount: number }) => sum + f.amount, 0
  );

  const leadsData = await leadsResult;
  const totalLeads = leadsData.total;
  const wonLeads = leadsData.won;
  const activeConversations = leadsData.active;
  const leadConversionRate = totalLeads > 0 ? wonLeads / totalLeads : 0;

  const toursBooked = (await toursResult).count ?? 0;
  const appStarts = (await applicationsResult).count ?? 0;
  const avgResponseMinutes = await responseTimeResult;

  return {
    leases_attributed:        leasesAttributed,
    performance_fees_cents:   performanceFeesCents,
    lead_conversion_rate:     leadConversionRate,
    avg_response_time_minutes: avgResponseMinutes,
    tours_booked:             toursBooked as number,
    application_starts:       appStarts as number,
    total_leads:              totalLeads,
    active_conversations:     activeConversations,
  };
}

// ─── Sub-queries ──────────────────────────────────────────────────────────────

async function buildLeadsQuery(
  db: ReturnType<typeof getSupabaseAdmin>,
  operatorId: string,
  propFilter: string[] | null
) {
  let query = db
    .from("leads")
    .select("status, property_id")
    .eq("properties.operator_id", operatorId);

  // Join through properties to scope by operator
  const { data: props } = await db
    .from("properties")
    .select("id")
    .eq("operator_id", operatorId);

  const ids = propFilter ?? props?.map((p: { id: string }) => p.id) ?? [];
  if (!ids.length) return { total: 0, won: 0, active: 0 };

  const { data } = await db
    .from("leads")
    .select("status")
    .in("property_id", ids);

  const rows = data ?? [];
  return {
    total:  rows.length,
    won:    rows.filter((r: { status: string }) => r.status === "won").length,
    active: rows.filter((r: { status: string }) =>
      ["contacted", "engaged", "tour_scheduled", "applied"].includes(r.status)
    ).length,
  };
}

async function buildToursQuery(
  db: ReturnType<typeof getSupabaseAdmin>,
  operatorId: string,
  propFilter: string[] | null
) {
  const { data: props } = await db
    .from("properties")
    .select("id")
    .eq("operator_id", operatorId);

  const ids = propFilter ?? props?.map((p: { id: string }) => p.id) ?? [];
  if (!ids.length) return { count: 0 };

  return db
    .from("tours")
    .select("id", { count: "exact", head: true })
    .in("property_id", ids)
    .in("status", ["scheduled", "completed"]);
}

async function buildApplicationsQuery(
  db: ReturnType<typeof getSupabaseAdmin>,
  operatorId: string,
  propFilter: string[] | null
) {
  const { data: props } = await db
    .from("properties")
    .select("id")
    .eq("operator_id", operatorId);

  const ids = propFilter ?? props?.map((p: { id: string }) => p.id) ?? [];
  if (!ids.length) return { count: 0 };

  return db
    .from("applications")
    .select("id", { count: "exact", head: true })
    .in("property_id", ids);
}

async function buildResponseTimeQuery(
  db: ReturnType<typeof getSupabaseAdmin>,
  operatorId: string,
  propFilter: string[] | null
): Promise<number> {
  const { data: props } = await db
    .from("properties")
    .select("id")
    .eq("operator_id", operatorId);

  const ids = propFilter ?? props?.map((p: { id: string }) => p.id) ?? [];
  if (!ids.length) return 0;

  // Get last 100 inbound messages and their next outbound reply
  const { data: inbound } = await db
    .from("conversations")
    .select("lead_id, created_at")
    .in("property_id", ids)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!inbound?.length) return 0;

  const deltas: number[] = [];

  for (const msg of inbound) {
    const { data: reply } = await db
      .from("conversations")
      .select("created_at")
      .eq("lead_id", msg.lead_id)
      .eq("direction", "outbound")
      .gt("created_at", msg.created_at)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (reply) {
      const deltaMs =
        new Date(reply.created_at).getTime() - new Date(msg.created_at).getTime();
      deltas.push(deltaMs / 60000); // convert to minutes
    }
  }

  if (!deltas.length) return 0;
  return Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
}

// ─── getLeaseConversionRate ───────────────────────────────────────────────────

export async function getLeaseConversionRate(propertyId: string): Promise<number> {
  const db = getSupabaseAdmin();
  const [totalResult, wonResult] = await Promise.all([
    db.from("leads").select("id", { count: "exact", head: true }).eq("property_id", propertyId),
    db.from("leads").select("id", { count: "exact", head: true })
      .eq("property_id", propertyId).eq("status", "won"),
  ]);

  const total = totalResult.count ?? 0;
  const won = wonResult.count ?? 0;
  return total > 0 ? won / total : 0;
}
