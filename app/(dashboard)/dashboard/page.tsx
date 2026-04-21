"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import IntelligenceSection from "./IntelligenceSection";
import { getOperatorEmail } from "@/lib/demo-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStatus = "new" | "contacted" | "engaged" | "tour_scheduled" | "applied" | "won" | "lost";

interface Lead {
  id: string;
  name: string;
  status: LeadStatus;
  property_name?: string;
  property_id?: string;
  created_at: string;
  last_contacted_at?: string;
  follow_up_at?: string;
}

interface ActivityItem {
  id: string;
  created_at: string;
  action: string;
  actor: "system" | "ai" | "agent";
  metadata?: Record<string, unknown>;
}

interface Operator {
  id: string;
  name: string;
}

interface Property {
  id: string;
  name: string;
  phone_number: string;
  total_units?: number | null;
  occupied_units?: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatAction(action: string, actor: string, meta?: Record<string, unknown>): string {
  switch (action) {
    case "lead_created":    return `New lead added${meta?.source ? ` via ${meta.source}` : ""}`;
    case "sms_sent":        return actor === "ai" ? `AI reply sent${meta?.preview ? ` — "${String(meta.preview).slice(0, 50)}…"` : ""}` : "SMS sent";
    case "sms_received":    return `Lead replied`;
    case "tour_scheduled":  return `Tour scheduled`;
    case "lead_won":        return `Lease signed 🎉`;
    case "lead_lost":       return `Lead marked lost`;
    case "human_takeover":  return `Human takeover triggered`;
    case "follow_up_sent":  return `Follow-up sent automatically`;
    default:                return action.replace(/_/g, " ");
  }
}

const STATUS_STYLES: Record<LeadStatus, { dot: string; label: string; text: string }> = {
  new:            { dot: "bg-indigo-400",  label: "New",          text: "text-indigo-700" },
  contacted:      { dot: "bg-sky-400",     label: "Contacted",    text: "text-sky-700" },
  engaged:        { dot: "bg-violet-400",  label: "Engaged",      text: "text-violet-700" },
  tour_scheduled: { dot: "bg-amber-400",   label: "Tour Booked",  text: "text-amber-700" },
  applied:        { dot: "bg-orange-400",  label: "Applied",      text: "text-orange-700" },
  won:            { dot: "bg-green-500",   label: "Won",          text: "text-green-700" },
  lost:           { dot: "bg-gray-400",    label: "Lost",         text: "text-gray-500" },
};

const PIPELINE_ORDER: LeadStatus[] = ["new", "contacted", "engaged", "tour_scheduled", "applied"];
const PIPELINE_COLORS: Record<LeadStatus, string> = {
  new: "bg-indigo-400", contacted: "bg-sky-400", engaged: "bg-violet-400",
  tour_scheduled: "bg-amber-400", applied: "bg-orange-400", won: "bg-green-400", lost: "bg-gray-300",
};

const ACTOR_STYLE: Record<string, string> = {
  ai:     "bg-violet-50 text-violet-700",
  system: "bg-gray-100 text-gray-500",
  agent:  "bg-blue-50 text-blue-700",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className ?? ""}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [operator, setOperator]     = useState<Operator | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [activity, setActivity]     = useState<ActivityItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [newIds, setNewIds]         = useState<Set<string>>(new Set());
  const operatorIdRef               = useRef<string | null>(null);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const pollActivity = useCallback(async () => {
    const opId = operatorIdRef.current;
    if (!opId) return;
    const res = await fetch(`/api/activity?operator_id=${opId}&limit=10`);
    const json = await res.json();
    const fresh: ActivityItem[] = json.activity ?? [];
    setActivity(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const added = fresh.filter(a => !existingIds.has(a.id));
      if (added.length === 0) return prev;
      setNewIds(ids => { const next = new Set(ids); added.forEach(a => next.add(a.id)); return next; });
      setTimeout(() => setNewIds(ids => { const next = new Set(ids); added.forEach(a => next.delete(a.id)); return next; }), 2000);
      return [...added, ...prev].slice(0, 10);
    });
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const email = await getOperatorEmail();
        if (!email) { router.push("/setup"); return; }

        const [setupRes, propRes] = await Promise.all([
          fetch(`/api/setup?email=${encodeURIComponent(email)}`),
          fetch(`/api/properties?email=${encodeURIComponent(email)}`),
        ]);
        const setupJson = await setupRes.json();
        const propJson  = await propRes.json();

        const op: Operator | null = setupJson.operator ?? null;
        const props: Property[]   = propJson.properties ?? [];
        setOperator(op);
        setProperties(props);

        if (!op || !props.length) return;

        operatorIdRef.current = op.id;

        const allLeads: Lead[] = [];
        await Promise.all(props.map(async (p) => {
          const res = await fetch(`/api/leads?propertyId=${p.id}`);
          const json = await res.json();
          const rows = (json.leads ?? []) as Lead[];
          rows.forEach((l) => { l.property_name = p.name; });
          allLeads.push(...rows);
        }));
        allLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setLeads(allLeads);

        const actRes = await fetch(`/api/activity?operator_id=${op.id}&limit=10`);
        const actJson = await actRes.json();
        setActivity(actJson.activity ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // Live poll every 30s
  useEffect(() => {
    const timer = setInterval(pollActivity, 30000);
    return () => clearInterval(timer);
  }, [pollActivity]);

  // Compute stats
  const activeLeads  = leads.filter((l) => !["won", "lost"].includes(l.status));
  const newLeads     = leads.filter((l) => l.status === "new");
  const tours        = leads.filter((l) => l.status === "tour_scheduled");
  const won          = leads.filter((l) => l.status === "won");

  // Portfolio occupancy
  const totalPortfolioUnits    = properties.reduce((s, p) => s + (p.total_units ?? 0), 0);
  const occupiedPortfolioUnits = properties.reduce((s, p) => s + (p.occupied_units ?? 0), 0);
  const portfolioOccPct = totalPortfolioUnits > 0
    ? Math.round((occupiedPortfolioUnits / totalPortfolioUnits) * 100)
    : null;

  // Pipeline counts
  const pipelineCounts = PIPELINE_ORDER.map((status) => ({
    status,
    label: STATUS_STYLES[status].label,
    color: PIPELINE_COLORS[status],
    count: leads.filter((l) => l.status === status).length,
  }));
  const maxPipeline = Math.max(...pipelineCounts.map((p) => p.count), 1);

  // Needs attention: new leads (no reply yet) + very old contacted leads
  const attentionLeads = [
    ...newLeads.map((l) => ({ lead: l, issue: "New lead — needs AI reply", urgency: "high" as const })),
    ...leads.filter((l) => l.status === "contacted" && l.last_contacted_at &&
      Date.now() - new Date(l.last_contacted_at).getTime() > 3 * 86400000
    ).map((l) => ({ lead: l, issue: "No reply in 3+ days — follow-up overdue", urgency: "high" as const })),
    ...leads.filter((l) => l.status === "tour_scheduled")
      .map((l) => ({ lead: l, issue: "Tour scheduled — confirm with lead", urgency: "medium" as const })),
  ].slice(0, 5);

  const operatorFirstName = operator?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-5 p-4 lg:p-6">

      {/* Greeting */}
      <div>
        {loading
          ? <Skeleton className="h-7 w-48" />
          : <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Good morning, {operatorFirstName}.</h1>
        }
        <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">
          {today} · {properties.length} {properties.length === 1 ? "property" : "properties"} · {activeLeads.length} active leads
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Portfolio Occupancy",
            value: loading || portfolioOccPct === null ? "—" : `${portfolioOccPct}%`,
            sub: loading ? "" : totalPortfolioUnits > 0 ? `${occupiedPortfolioUnits}/${totalPortfolioUnits} units` : "No unit data",
            accent: portfolioOccPct !== null && portfolioOccPct >= 90 ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20",
            accentText: portfolioOccPct !== null && portfolioOccPct >= 90 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
            trend: portfolioOccPct !== null ? (portfolioOccPct >= 90 ? "At target" : `${90 - portfolioOccPct}% below target`) : "Upload rent rolls",
            trendUp: portfolioOccPct !== null && portfolioOccPct >= 90,
          },
          {
            label: "Active Leads",
            value: loading ? "—" : activeLeads.length.toString(),
            sub: loading ? "" : `${newLeads.length} new · need reply`,
            accent: "bg-indigo-50 dark:bg-indigo-900/20",
            accentText: "text-indigo-600 dark:text-indigo-400",
            trend: newLeads.length > 0 ? `${newLeads.length} awaiting reply` : "All caught up",
            trendUp: newLeads.length === 0,
          },
          {
            label: "Tours Scheduled",
            value: loading ? "—" : tours.length.toString(),
            sub: "pending or upcoming",
            accent: "bg-amber-50 dark:bg-amber-900/20",
            accentText: "text-amber-600 dark:text-amber-400",
            trend: tours.length > 0 ? `${tours.length} to confirm` : "None scheduled",
            trendUp: false,
          },
          {
            label: "Leases Won",
            value: loading ? "—" : won.length.toString(),
            sub: "via LeaseUp Bulldog",
            accent: "bg-green-50 dark:bg-green-900/20",
            accentText: "text-green-600 dark:text-green-400",
            trend: won.length > 0 ? `${won.length} lease${won.length > 1 ? "s" : ""} signed` : "First one incoming",
            trendUp: won.length > 0,
          },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E]">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{k.label}</p>
            {loading
              ? <Skeleton className="mt-2 h-9 w-20" />
              : <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{k.value}</p>
            }
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{k.sub}</p>
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${k.accent} ${k.accentText}`}>
                {k.trendUp ? "↑" : "→"} {k.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Property health grid */}
      {!loading && properties.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Property Health</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => {
              const occ = p.total_units && p.occupied_units != null
                ? Math.round((p.occupied_units / p.total_units) * 100)
                : null;
              const isGood = occ !== null && occ >= 90;
              const isWarn = occ !== null && occ >= 75 && occ < 90;
              const isBad  = occ !== null && occ < 75;
              return (
                <Link key={p.id} href={`/properties/${p.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E] hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)] transition-shadow">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                    isGood ? "bg-green-50 text-green-600 dark:bg-green-900/20" :
                    isWarn ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20" :
                    isBad  ? "bg-red-50 text-red-600 dark:bg-red-900/20" :
                    "bg-gray-100 text-gray-400 dark:bg-white/10"
                  }`}>
                    {occ !== null ? `${occ}%` : "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      {occ !== null
                        ? `${p.occupied_units}/${p.total_units} units · ${isGood ? "On target" : `${90 - occ}% below target`}`
                        : "No rent roll uploaded"}
                    </p>
                  </div>
                  {!isGood && occ !== null && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isBad ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"}`}>
                      {isBad ? "Critical" : "Below 90%"}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Occupancy Gap & Pipeline Coverage */}
      {!loading && properties.some(p => (p.total_units ?? 0) > 0) && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Occupancy Gap & Pipeline Coverage</h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Active leads that could fill vacancies</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {properties.filter(p => (p.total_units ?? 0) > 0).map(p => {
              const vacancies  = (p.total_units ?? 0) - (p.occupied_units ?? 0);
              const occ        = p.total_units ? Math.round(((p.occupied_units ?? 0) / p.total_units) * 100) : null;
              const propLeads  = leads.filter(l => l.property_id === p.id && ["new","contacted","engaged","tour_scheduled","applied"].includes(l.status));
              const hotLeads   = leads.filter(l => l.property_id === p.id && ["tour_scheduled","applied"].includes(l.status));
              const coverage   = vacancies > 0 ? Math.min(Math.round((propLeads.length / vacancies) * 100), 200) : null;
              const isFullyCovered = propLeads.length >= vacancies && vacancies > 0;
              const isGood     = occ !== null && occ >= 90;

              return (
                <div key={p.id} className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E]">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[140px]">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{occ !== null ? `${occ}% occupied` : "No unit data"}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      vacancies === 0 ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" :
                      vacancies <= 2  ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" :
                                        "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                    }`}>
                      {vacancies === 0 ? "Full" : `${vacancies} vacant`}
                    </span>
                  </div>

                  {vacancies > 0 ? (
                    <>
                      {/* Coverage bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-400">Pipeline coverage</span>
                          <span className={`text-[10px] font-bold ${isFullyCovered ? "text-emerald-600" : "text-amber-600"}`}>
                            {propLeads.length} lead{propLeads.length !== 1 ? "s" : ""} / {vacancies} vacancy{vacancies !== 1 ? "ies" : ""}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(coverage ?? 0, 100)}%`,
                              background: isFullyCovered ? "#10B981" : (coverage ?? 0) >= 50 ? "#F59E0B" : "#EF4444",
                            }} />
                        </div>
                      </div>
                      {/* Hot leads */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          <span className="text-[10px] text-gray-400">{hotLeads.length} tour/applied</span>
                        </div>
                        {isFullyCovered && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                            Pipeline full
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
                        <svg viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth={2} className="h-3.5 w-3.5">
                          <path d="M2 8l5 5 7-8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Fully occupied — great work!</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Intelligence */}
      <IntelligenceSection />

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

        {/* Needs Attention */}
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E]">
          <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4 dark:border-white/5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Needs Attention</h3>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Leads requiring action now</p>
            </div>
            <Link href="/leads" className="text-xs font-medium text-[#C8102E] hover:underline">View all →</Link>
          </div>

          {loading ? (
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {[1,2,3].map((i) => (
                <div key={i} className="flex items-start gap-4 px-6 py-4">
                  <Skeleton className="mt-1 h-2.5 w-2.5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-2.5 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : attentionLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2} className="h-6 w-6">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">All caught up!</p>
              <p className="mt-1 text-xs text-gray-400">No leads need immediate attention.</p>
              {leads.length === 0 && (
                <Link href="/leads" className="mt-3 rounded-xl bg-[#C8102E] px-4 py-2 text-xs font-bold text-white hover:bg-[#A50D25]">
                  Add First Lead →
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {attentionLeads.map(({ lead, issue, urgency }) => {
                const st = STATUS_STYLES[lead.status];
                return (
                  <Link key={lead.id} href="/leads"
                    className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/5">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${urgency === "high" ? "bg-red-400" : "bg-amber-400"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lead.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.text} bg-opacity-10`}
                          style={{ background: `${st.dot === "bg-indigo-400" ? "#EEF2FF" : st.dot === "bg-amber-400" ? "#FFFBEB" : "#F5F3FF"}` }}>
                          {st.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{issue}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{lead.property_name}</p>
                    </div>
                    <span className={`shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgency === "high" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                      {relativeTime(lead.created_at)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Pipeline + Activity */}
        <div className="flex flex-col gap-4">

          {/* Pipeline */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pipeline</h3>
              <Link href="/leads" className="text-[11px] font-medium text-[#C8102E] hover:underline">Open →</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : leads.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-gray-400">No leads yet.</p>
                <Link href="/leads" className="mt-2 block text-xs font-semibold text-[#C8102E] hover:underline">Add first lead →</Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pipelineCounts.map((s) => (
                  <div key={s.status}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</span>
                      <span className="text-[11px] font-bold tabular-nums text-gray-900 dark:text-gray-100">{s.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                      <div className={`h-full rounded-full ${s.color} transition-all`}
                        style={{ width: `${(s.count / maxPipeline) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Activity Feed */}
          <div className="flex-1 rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Live Activity</h3>
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Skeleton className="mt-1.5 h-1.5 w-1.5 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-gray-400">Activity will appear here as leads come in.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2.5 rounded-lg transition-all duration-500 ${newIds.has(item.id) ? "bg-violet-50 dark:bg-violet-900/10 -mx-2 px-2 py-1" : ""}`}
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.actor === "ai" ? "bg-violet-400" : item.actor === "agent" ? "bg-blue-400" : "bg-gray-300"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                        {formatAction(item.action, item.actor, item.metadata)}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className={`rounded px-1 py-0.5 text-[9px] font-semibold capitalize ${ACTOR_STYLE[item.actor] ?? "bg-gray-100 text-gray-500"}`}>
                          {item.actor}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{relativeTime(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Setup prompt if no properties */}
      {!loading && properties.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-white/10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C8102E]/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth={1.75} className="h-7 w-7">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">Add your first property</h3>
          <p className="mb-4 text-sm text-gray-400">Set up your property and Twilio number to start receiving AI-managed leads.</p>
          <Link href="/properties/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
            style={{ boxShadow: "0 6px 20px rgba(200,16,46,0.25)" }}>
            Set Up Property →
          </Link>
        </div>
      )}
    </div>
  );
}
