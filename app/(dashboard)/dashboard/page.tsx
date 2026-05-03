"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import IntelligenceSection from "./IntelligenceSection";
import { getOperatorEmail, authFetch } from "@/lib/demo-auth";
import { IconBuilding, IconUsers, IconCalendar, IconCheck } from "@/components/marketing/Icons";

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

type TabId = "activity" | "conversations" | "performance";
type PeriodKey = "7d" | "30d" | "month" | "all";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  "7d":   "Last 7 days",
  "30d":  "Last 30 days",
  "month": "This month",
  "all":  "All time",
};

function periodStartMs(p: PeriodKey): number {
  const now = Date.now();
  if (p === "7d")  return now - 7 * 86400000;
  if (p === "30d") return now - 30 * 86400000;
  if (p === "month") {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }
  return 0;
}

export default function DashboardPage() {
  const router = useRouter();
  const [operator, setOperator]     = useState<Operator | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [activity, setActivity]     = useState<ActivityItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [newIds, setNewIds]         = useState<Set<string>>(new Set());
  const operatorIdRef               = useRef<string | null>(null);

  // Filter state
  const [activeTab, setActiveTab]               = useState<TabId>("activity");
  const [period, setPeriod]                     = useState<PeriodKey>("30d");
  const [selectedPropertyId, setSelectedPropId] = useState<string>("all");
  const [showPeriodMenu, setShowPeriodMenu]     = useState(false);
  const [showPropMenu, setShowPropMenu]         = useState(false);

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
          authFetch(`/api/setup`),
          authFetch(`/api/properties`),
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

  // Apply period + property filters before computing any stats
  const periodCutoff = periodStartMs(period);
  const filteredProps = selectedPropertyId === "all"
    ? properties
    : properties.filter((p) => p.id === selectedPropertyId);
  const visibleLeads = leads
    .filter((l) => new Date(l.created_at).getTime() >= periodCutoff)
    .filter((l) => selectedPropertyId === "all" || l.property_id === selectedPropertyId);

  // Compute stats from filtered leads
  const activeLeads  = visibleLeads.filter((l) => !["won", "lost"].includes(l.status));
  const newLeads     = visibleLeads.filter((l) => l.status === "new");
  const tours        = visibleLeads.filter((l) => l.status === "tour_scheduled");
  const won          = visibleLeads.filter((l) => l.status === "won");

  // Portfolio occupancy (uses filtered properties — single property when filter is on)
  const totalPortfolioUnits    = filteredProps.reduce((s, p) => s + (p.total_units ?? 0), 0);
  const occupiedPortfolioUnits = filteredProps.reduce((s, p) => s + (p.occupied_units ?? 0), 0);
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

      {/* Hero — preview-style big title + welcome subtitle */}
      <div>
        {loading
          ? <Skeleton className="h-9 w-48" />
          : <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
        }
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back, {operatorFirstName} — here&apos;s what happened overnight.
        </p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          {today} · {properties.length} {properties.length === 1 ? "property" : "properties"} · {activeLeads.length} active leads
        </p>
      </div>

      {/* Tabs row + filters (functional dropdowns) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-[#1E1E2E] dark:bg-[#10101A]">
          {([
            { id: "activity",      label: "Activity",      icon: (
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <polyline points="13 7 10.5 7 8.75 12 5.25 2 3.5 7 1 7" />
              </svg>
            ) },
            { id: "conversations", label: "Conversations", icon: (
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12.25 8.75c0 .35-.31.66-.66.66H4.08l-2.33 2.33V3.5c0-.35.31-.66.66-.66h9.18c.35 0 .66.31.66.66v5.25z" />
              </svg>
            ) },
            { id: "performance",   label: "Performance",   icon: (
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <line x1="10.5" y1="11.7" x2="10.5" y2="5.83" /><line x1="7" y1="11.7" x2="7" y2="2.33" /><line x1="3.5" y1="11.7" x2="3.5" y2="8.17" />
              </svg>
            ) },
          ] as { id: TabId; label: string; icon: React.ReactNode }[]).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                style={
                  isActive
                    ? { background: "rgba(200,16,46,0.10)", color: "#C8102E" }
                    : { color: "var(--tab-muted)" }
                }
              >
                <span style={isActive ? { color: "#C8102E" } : undefined}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector — real dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowPeriodMenu((s) => !s); setShowPropMenu(false); }}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-[#C8102E]/40 dark:border-[#1E1E2E] dark:bg-[#10101A] dark:text-gray-300"
            >
              <span className="text-gray-400 dark:text-gray-500">Period:</span>
              {PERIOD_LABELS[period]}
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} className={`h-3 w-3 transition-transform ${showPeriodMenu ? "rotate-180" : ""}`}>
                <polyline points="3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {showPeriodMenu && (
              <div className="absolute right-0 top-full z-30 mt-2 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-[#1E1E2E] dark:bg-[#10101A]">
                {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); setShowPeriodMenu(false); }}
                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    {PERIOD_LABELS[p]}
                    {period === p && <span className="text-[#C8102E]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property filter — real dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowPropMenu((s) => !s); setShowPeriodMenu(false); }}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-[#C8102E]/40 dark:border-[#1E1E2E] dark:bg-[#10101A] dark:text-gray-300"
            >
              {selectedPropertyId === "all"
                ? "All Properties"
                : (properties.find((p) => p.id === selectedPropertyId)?.name ?? "Property")}
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} className={`h-3 w-3 transition-transform ${showPropMenu ? "rotate-180" : ""}`}>
                <polyline points="3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {showPropMenu && (
              <div className="absolute right-0 top-full z-30 mt-2 w-56 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-[#1E1E2E] dark:bg-[#10101A]">
                <button
                  onClick={() => { setSelectedPropId("all"); setShowPropMenu(false); }}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  All Properties
                  {selectedPropertyId === "all" && <span className="text-[#C8102E]">✓</span>}
                </button>
                {properties.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPropId(p.id); setShowPropMenu(false); }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    <span className="truncate">{p.name}</span>
                    {selectedPropertyId === p.id && <span className="flex-shrink-0 text-[#C8102E]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`:global(:root) { --tab-muted: #6B7280; } :global(.dark) { --tab-muted: #9CA3AF; }`}</style>

      {/* Conversations tab — quick redirect to dedicated page */}
      {activeTab === "conversations" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-[#1E1E2E] dark:bg-[#10101A]">
          <p className="mb-3 text-base font-semibold text-gray-900 dark:text-white">View conversations in the dedicated workspace</p>
          <p className="mb-5 text-sm text-gray-500">All your AI-powered SMS threads in one place — search, filter, and take over any time.</p>
          <Link href="/conversations" className="inline-flex items-center gap-2 rounded-full bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:scale-105 transition-transform" style={{ boxShadow: "0 0 25px rgba(200,16,46,0.4)" }}>
            Open Conversations →
          </Link>
        </div>
      )}

      {/* Getting Started banner — shown when leads count is 0 (new user) */}
      {!loading && leads.length === 0 && (
        <Link
          href="/getting-started"
          className="flex items-center justify-between rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/5 px-5 py-4 hover:bg-[#C8102E]/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/20 text-[#C8102E] text-sm font-bold">✓</div>
            <div>
              <p className="text-sm font-semibold text-white">Complete your setup</p>
              <p className="text-xs text-gray-400 mt-0.5">Follow the step-by-step guide to get your first lead flowing in.</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#C8102E] shrink-0">View guide →</span>
        </Link>
      )}

      {/* The rest of the dashboard renders only on the Activity + Performance tabs */}
      {activeTab !== "conversations" && (<>

      {/* KPI strip — preview-style gradient icon tiles, theme-aware, mobile-responsive */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          {
            label: "Portfolio Occupancy",
            value: loading || portfolioOccPct === null ? "—" : `${portfolioOccPct}%`,
            sub: loading ? "" : totalPortfolioUnits > 0 ? `${occupiedPortfolioUnits}/${totalPortfolioUnits} units` : "No unit data",
            trend: portfolioOccPct !== null ? (portfolioOccPct >= 90 ? "At target" : `${90 - portfolioOccPct}% below target`) : "Upload rent rolls",
            trendUp: portfolioOccPct !== null && portfolioOccPct >= 90,
            Icon: IconBuilding,
            gradient: "linear-gradient(135deg, #C8102E, #A50D25)",
            shadowColor: "rgba(200,16,46,0.4)",
          },
          {
            label: "Active Leads",
            value: loading ? "—" : activeLeads.length.toString(),
            sub: loading ? "" : `${newLeads.length} new · need reply`,
            trend: newLeads.length > 0 ? `${newLeads.length} awaiting reply` : "All caught up",
            trendUp: newLeads.length === 0,
            Icon: IconUsers,
            gradient: "linear-gradient(135deg, #A78BFA, #7C5BE6)",
            shadowColor: "rgba(167,139,250,0.4)",
          },
          {
            label: "Tours Scheduled",
            value: loading ? "—" : tours.length.toString(),
            sub: "pending or upcoming",
            trend: tours.length > 0 ? `${tours.length} to confirm` : "None scheduled",
            trendUp: false,
            Icon: IconCalendar,
            gradient: "linear-gradient(135deg, #F59E0B, #D97706)",
            shadowColor: "rgba(245,158,11,0.4)",
          },
          {
            label: "Leases Won",
            value: loading ? "—" : won.length.toString(),
            sub: "via LeaseUp Bulldog",
            trend: won.length > 0 ? `${won.length} lease${won.length > 1 ? "s" : ""} signed` : "First one incoming",
            trendUp: won.length > 0,
            Icon: IconCheck,
            gradient: "linear-gradient(135deg, #F87171, #C8102E)",
            shadowColor: "rgba(248,113,113,0.4)",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#C8102E]/40 hover:shadow-[0_0_32px_rgba(200,16,46,0.18)] dark:border-[#1E1E2E] dark:bg-[#10101A] dark:hover:shadow-[0_0_40px_rgba(200,16,46,0.25)]"
          >
            <div className="mb-4 flex items-start justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg sm:h-11 sm:w-11"
                style={{ background: k.gradient, boxShadow: `0 8px 24px ${k.shadowColor}` }}
              >
                <k.Icon size={20} />
              </div>
              {k.trendUp && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C8102E] pulse-dot" />
              )}
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-500">{k.label}</p>
            {loading
              ? <Skeleton className="mt-2 h-8 w-20" />
              : <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">{k.value}</p>
            }
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-500">{k.sub}</p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px]">
              <span className={k.trendUp ? "text-[#C8102E] dark:text-[#F87171]" : "text-gray-400 dark:text-gray-500"}>
                {k.trendUp ? "▲" : "→"} {k.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Lead Volume Heatmap + Hot Leads (preview-style grid) ──────────── */}
      {!loading && properties.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Lead volume heatmap (col-span-2) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2 dark:border-[#1E1E2E] dark:bg-[#10101A]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">Lead volume — last 12 weeks</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{leads.length}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">total leads · {properties.length} properties</span>
                </p>
              </div>
              <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:border-[#1E1E2E] dark:text-gray-300">
                Weekly
              </span>
            </div>
            <Heatmap leads={leads} properties={properties} />
          </div>

          {/* Hot Leads side panel */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-[#1E1E2E] dark:bg-[#10101A]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Hot Leads</h3>
              <Link href="/leads" className="flex items-center gap-1 text-xs font-semibold text-[#C8102E] hover:text-[#A50D25] dark:text-[#F87171]">
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {leads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400 dark:border-[#1E1E2E] dark:text-gray-500">
                  No leads yet — they&apos;ll appear here as they come in.
                </div>
              ) : (
                attentionLeads.slice(0, 3).map(({ lead, urgency }) => {
                  const status = STATUS_STYLES[lead.status];
                  const initial = lead.name?.charAt(0).toUpperCase() ?? "?";
                  const grad =
                    urgency === "high"
                      ? "linear-gradient(135deg, #C8102E, #A50D25)"
                      : urgency === "medium"
                      ? "linear-gradient(135deg, #F59E0B, #D97706)"
                      : "linear-gradient(135deg, #A78BFA, #7C5BE6)";
                  const badgeText = urgency === "high" ? "HOT" : urgency === "medium" ? "WARM" : "NEW";
                  const badgeColor = urgency === "high" ? "bg-[#C8102E]/15 text-[#F87171]" : urgency === "medium" ? "bg-amber-500/15 text-amber-500" : "bg-violet-400/15 text-violet-400";
                  return (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="group block rounded-xl border border-gray-200 bg-gray-50 p-3 transition-all hover:-translate-y-0.5 hover:border-[#C8102E]/40 hover:shadow-[0_0_24px_rgba(200,16,46,0.15)] dark:border-[#1E1E2E] dark:bg-[#16161F]"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ background: grad }}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{lead.name}</p>
                            <p className="truncate text-[11px] text-gray-500 dark:text-gray-500">{lead.property_name ?? "—"}</p>
                          </div>
                        </div>
                        <span className={`flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </div>
                      <div className="mb-2 flex items-center gap-1.5 text-[11px]">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        <span className="font-medium text-gray-600 dark:text-gray-300">{status.label}</span>
                        <span className="text-gray-400 dark:text-gray-600">·</span>
                        <span className="text-gray-400 dark:text-gray-500">{relativeTime(lead.created_at)}</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

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
                  className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C8102E]/40 hover:shadow-[0_0_24px_rgba(200,16,46,0.15)] dark:border-[#1E1E2E] dark:bg-[#10101A]">
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

      </>)} {/* end of activeTab !== "conversations" */}
    </div>
  );
}

// ─── Heatmap (preview-style colored squares grid) ────────────────────────────
// Renders lead volume per property × week as a heatmap. Uses real lead data.
function Heatmap({ leads, properties }: { leads: Lead[]; properties: Property[] }) {
  const COLS = 12; // last 12 weeks
  const ROWS = Math.min(properties.length, 6) || 1;

  // Color ramp: 0 = empty, increasing intensity to peak (white)
  const COLORS_LIGHT = ["#F3F4F6", "#FCE7EB", "#F8B4BD", "#F87171", "#DC2626", "#C8102E", "#7F1D1D"];
  const COLORS_DARK  = ["#1E1E2E", "#3A1620", "#5C1623", "#8B1428", "#C8102E", "#F87171", "#FFFFFF"];

  // Bucket leads by property × week (where week 0 = oldest of last 12, week 11 = current)
  const now = Date.now();
  const weekMs = 7 * 24 * 3600 * 1000;
  const propIds = properties.slice(0, ROWS).map((p) => p.id);
  const grid: number[][] = propIds.map(() => new Array(COLS).fill(0));

  leads.forEach((l) => {
    const weeksAgo = Math.floor((now - new Date(l.created_at).getTime()) / weekMs);
    if (weeksAgo < 0 || weeksAgo >= COLS) return;
    const propIdx = propIds.indexOf(l.property_id ?? "");
    if (propIdx === -1) return;
    grid[propIdx][COLS - 1 - weeksAgo]++;
  });

  // Normalize to 0-6 intensity
  const max = Math.max(1, ...grid.flat());
  const intensity = (v: number) => Math.min(6, Math.round((v / max) * 6));

  return (
    <div>
      <div className="space-y-1.5">
        {grid.map((row, ri) => (
          <div key={ri} className="flex items-center gap-2">
            <span className="hidden w-24 truncate text-[10px] text-gray-500 dark:text-gray-500 sm:block">
              {properties[ri]?.name ?? "—"}
            </span>
            <div className="flex flex-1 gap-1.5">
              {row.map((v, ci) => {
                const idx = intensity(v);
                return (
                  <div
                    key={ci}
                    title={v > 0 ? `${v} lead${v === 1 ? "" : "s"} · ${properties[ri]?.name ?? ""}` : ""}
                    className="h-7 flex-1 rounded-md transition-transform hover:scale-110"
                    style={{
                      background: `var(--hm-${idx})`,
                      // Light/dark via CSS vars set on parent
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 ml-0 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 sm:ml-26">
        <span>12 weeks ago</span>
        <span>This week</span>
      </div>

      {/* CSS variable bridges for theme-aware colors */}
      <style jsx>{`
        div :global(div[style*="--hm-0"]) { background: ${COLORS_LIGHT[0]}; }
        :global(.dark) div :global(div[style*="--hm-0"]) { background: ${COLORS_DARK[0]}; }
      `}</style>
      <style>{`
        :root { ${COLORS_LIGHT.map((c, i) => `--hm-${i}: ${c};`).join(" ")} }
        :root.dark { ${COLORS_DARK.map((c, i) => `--hm-${i}: ${c};`).join(" ")} }
      `}</style>
    </div>
  );
}
