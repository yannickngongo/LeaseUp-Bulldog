"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getOperatorEmail } from "@/lib/demo-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface Lead {
  id: string;
  status: string;
  source?: string;
  created_at: string;
}

interface MarketAnalysis {
  marketSummary: string;
  avgRent1BR: string;
  avgRent2BR: string;
  vacancyRate: string;
  marketTrend: string;
  trendLabel: string;
  yoyRentGrowth: string;
  demandDrivers: string[];
  competitiveThreats: string[];
  recommendation: string;
}

interface PropertyWithLeads extends Property {
  leads: Lead[];
  market?: MarketAnalysis | null;
  marketLoading?: boolean;
  marketError?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 dark:bg-white/5 ${className ?? ""}`} />;
}

const STATUS_ORDER = ["new", "contacted", "tour_scheduled", "applied", "won"];
const STATUS_LABELS: Record<string, string> = {
  new: "New Leads",
  contacted: "Contacted",
  tour_scheduled: "Toured",
  applied: "Applied",
  won: "Moved In",
};

function FunnelChart({ leads }: { leads: Lead[] }) {
  const counts = STATUS_ORDER.map(s => ({
    label: STATUS_LABELS[s],
    value: leads.filter(l => STATUS_ORDER.indexOf(l.status) >= STATUS_ORDER.indexOf(s)).length,
    color: ["#6366F1", "#06B6D4", "#F59E0B", "#F97316", "#22C55E"][STATUS_ORDER.indexOf(s)],
  }));
  const max = counts[0].value;
  if (max === 0) return <p className="text-xs text-gray-400 py-4 text-center">No leads to show.</p>;

  return (
    <div className="space-y-2">
      {counts.map((stage, i) => {
        const pct = max === 0 ? 0 : Math.round((stage.value / max) * 100);
        const prev = i === 0 ? null : counts[i - 1].value;
        const convPct = prev === null || prev === 0 ? null : Math.round((stage.value / prev) * 100);
        return (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">{stage.label}</span>
              <div className="flex items-center gap-2">
                {convPct !== null && (
                  <span className={cn("text-[10px] font-medium", convPct < 50 ? "text-red-500" : "text-gray-400")}>
                    {convPct}% of prev
                  </span>
                )}
                <span className="w-6 text-right text-xs font-bold text-gray-900 dark:text-gray-100">{stage.value}</span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: stage.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SourceChart({ leads }: { leads: Lead[] }) {
  const sourceCounts: Record<string, number> = {};
  leads.forEach(l => {
    const src = l.source || "Unknown";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const sources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = sources[0]?.[1] ?? 1;
  const colors = ["#6366F1", "#22C55E", "#F59E0B", "#06B6D4", "#8B5CF6"];

  if (sources.length === 0) return <p className="text-xs text-gray-400 py-4 text-center">No lead sources yet.</p>;

  return (
    <div className="space-y-3">
      {sources.map(([name, count], i) => (
        <div key={name}>
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i] }} />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{name}</span>
            </div>
            <span className="text-[11px] text-gray-500">{count} lead{count !== 1 ? "s" : ""}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
            <div style={{ width: `${(count / max) * 100}%`, backgroundColor: colors[i] }} className="h-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadVolumeChart({ leads }: { leads: Lead[] }) {
  const weeks: Record<string, number> = {};
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weeks[key] = 0;
  }
  leads.forEach(l => {
    const d = new Date(l.created_at);
    const daysDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    const weekIdx = Math.floor(daysDiff / 7);
    if (weekIdx <= 7) {
      const d2 = new Date(now);
      d2.setDate(now.getDate() - weekIdx * 7);
      const key = d2.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (weeks[key] !== undefined) weeks[key]++;
    }
  });

  const entries = Object.entries(weeks);
  const max = Math.max(...entries.map(e => e[1]), 1);
  const H = 80;

  if (leads.length === 0) return <p className="text-xs text-gray-400 py-4 text-center">No lead volume data yet.</p>;

  return (
    <svg viewBox={`0 0 260 ${H + 24}`} className="w-full">
      {entries.map(([label, count], i) => {
        const barW = 20, gap = 12;
        const totalW = entries.length * (barW + gap) - gap;
        const xOffset = (260 - totalW) / 2;
        const x = xOffset + i * (barW + gap);
        const barH = (count / max) * H;
        return (
          <g key={label}>
            <rect x={x} y={H - barH} width={barW} height={barH} rx={3} fill="#6366F1" opacity={0.85} />
            <text x={x + barW / 2} y={H + 16} textAnchor="middle" style={{ fontSize: 6, fill: "#9CA3AF" }}>
              {label.split(" ")[1]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Market Research Card ─────────────────────────────────────────────────────

const TREND_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  strong_demand: { bg: "bg-green-50 dark:bg-green-900/10", text: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
  stable:        { bg: "bg-blue-50 dark:bg-blue-900/10",   text: "text-blue-700 dark:text-blue-400",   dot: "bg-blue-500" },
  softening:     { bg: "bg-amber-50 dark:bg-amber-900/10", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
};

function MarketResearchCard({
  property,
  onRun,
}: {
  property: PropertyWithLeads;
  onRun: (id: string) => void;
}) {
  const { market, marketLoading, marketError } = property;

  if (marketLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/20">
          <span className="text-violet-500 text-sm">✦</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          AI market analysis for {property.city}, {property.state} {property.zip}
        </p>
        {marketError && (
          <p className="text-[11px] text-red-500 mb-2">{marketError}</p>
        )}
        <button
          onClick={() => onRun(property.id)}
          className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A50D25] transition-colors"
        >
          Generate Market Analysis →
        </button>
      </div>
    );
  }

  const trend = TREND_STYLES[market.marketTrend] ?? TREND_STYLES.stable;

  return (
    <div className="space-y-4">
      {/* Trend badge + summary */}
      <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2", trend.bg)}>
        <span className={cn("h-2 w-2 rounded-full shrink-0", trend.dot)} />
        <span className={cn("text-xs font-semibold", trend.text)}>{market.trendLabel}</span>
        <span className={cn("text-xs", trend.text, "opacity-70")}>· {market.yoyRentGrowth} YoY rent growth</span>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{market.marketSummary}</p>

      {/* Rent grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "1BR Avg Rent", value: market.avgRent1BR },
          { label: "2BR Avg Rent", value: market.avgRent2BR },
          { label: "Vacancy Rate", value: market.vacancyRate },
        ].map(m => (
          <div key={m.label} className="rounded-lg bg-gray-50 dark:bg-white/5 px-2 py-2.5 text-center">
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{m.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Drivers */}
      {market.demandDrivers?.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Demand Drivers</p>
          <ul className="space-y-1">
            {market.demandDrivers.map((d, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-green-400" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Threats */}
      {market.competitiveThreats?.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Watch Out For</p>
          <ul className="space-y-1">
            {market.competitiveThreats.map((t, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      <div className="flex items-start gap-2 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-3 py-2">
        <span className="text-[#C8102E] text-xs mt-0.5 shrink-0">→</span>
        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{market.recommendation}</p>
      </div>

      <button
        onClick={() => onRun(property.id)}
        className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
      >
        Refresh analysis →
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [properties, setProperties] = useState<PropertyWithLeads[]>([]);
  const [allLeads, setAllLeads]     = useState<Lead[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const email = await getOperatorEmail();
        if (!email) return;

        const propRes = await fetch(`/api/properties?email=${encodeURIComponent(email)}`);
        const propJson = await propRes.json();
        const props: Property[] = propJson.properties ?? [];

        const withLeads = await Promise.all(props.map(async (p) => {
          const res = await fetch(`/api/leads?propertyId=${p.id}`);
          const json = await res.json();
          return { ...p, leads: json.leads ?? [], market: null, marketLoading: false };
        }));

        setProperties(withLeads);
        setAllLeads(withLeads.flatMap(p => p.leads));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function runMarketResearch(propertyId: string) {
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return;

    setProperties(prev => prev.map(p =>
      p.id === propertyId ? { ...p, marketLoading: true, marketError: undefined } : p
    ));

    try {
      const res = await fetch("/api/intelligence/market-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: prop.id,
          name: prop.name,
          address: prop.address,
          city: prop.city,
          state: prop.state,
          zip: prop.zip,
        }),
      });
      const json = await res.json();
      setProperties(prev => prev.map(p =>
        p.id === propertyId
          ? { ...p, marketLoading: false, market: json.analysis ?? null, marketError: json.error }
          : p
      ));
    } catch {
      setProperties(prev => prev.map(p =>
        p.id === propertyId
          ? { ...p, marketLoading: false, marketError: "Analysis failed — check API keys" }
          : p
      ));
    }
  }

  const totalLeads    = allLeads.length;
  const activeLeads   = allLeads.filter(l => !["won","lost"].includes(l.status)).length;
  const touredLeads   = allLeads.filter(l => STATUS_ORDER.indexOf(l.status) >= STATUS_ORDER.indexOf("tour_scheduled")).length;
  const wonLeads      = allLeads.filter(l => l.status === "won").length;
  const convRate      = totalLeads === 0 ? 0 : Math.round((wonLeads / totalLeads) * 100);

  return (
    <div className="space-y-6 p-4 lg:p-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Insights</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Loading…" : `Live data from ${properties.length} propert${properties.length !== 1 ? "ies" : "y"}`}
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/20 px-3 py-1 text-xs font-medium text-violet-700 dark:text-violet-400">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          Powered by Claude
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      )}

      {/* No properties */}
      {!loading && properties.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#C8102E]/8">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth={1.5} className="h-8 w-8">
              <path d="M1.5 13.5 6 8.5l4 3.5 6-8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12.5 4H17v4.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">No data yet</h3>
          <p className="mb-5 text-sm text-gray-400">Add a property and start collecting leads to see insights.</p>
          <a href="/setup"
            className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors">
            Set Up Property →
          </a>
        </div>
      )}

      {/* Has properties */}
      {!loading && properties.length > 0 && (
        <>
          {/* Summary KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Leads",     value: totalLeads,               sub: "all time" },
              { label: "Active Pipeline", value: activeLeads,              sub: "not won or lost" },
              { label: "Toured",          value: touredLeads,              sub: "reached tour stage" },
              { label: "Conversion Rate", value: `${convRate}%`,           sub: "lead → move-in" },
            ].map(c => (
              <div key={c.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{c.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{c.value}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Lead Volume */}
            <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E]">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Lead Volume</h3>
                <span className="text-[11px] text-gray-400">8-week trend</span>
              </div>
              <p className="mb-3 text-xs text-gray-400">New leads per week · all properties</p>
              <LeadVolumeChart leads={allLeads} />
            </div>

            {/* Conversion Funnel */}
            <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E]">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Conversion Funnel</h3>
                <span className="text-[11px] text-gray-400">All time</span>
              </div>
              <p className="mb-3 text-xs text-gray-400">Lead → move-in pipeline</p>
              <FunnelChart leads={allLeads} />
            </div>

            {/* Lead Sources */}
            <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E]">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Lead Sources</h3>
                <span className="text-[11px] text-gray-400">All properties</span>
              </div>
              <p className="mb-3 text-xs text-gray-400">Where your leads are coming from</p>
              <SourceChart leads={allLeads} />
            </div>
          </div>

          {/* Per-property stats */}
          {properties.length > 1 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Per-Property Breakdown</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map(p => {
                  const active = p.leads.filter(l => !["won","lost"].includes(l.status)).length;
                  const tours = p.leads.filter(l => l.status === "tour_scheduled").length;
                  const won = p.leads.filter(l => l.status === "won").length;
                  return (
                    <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{p.name}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Active", value: active },
                          { label: "Tours",  value: tours },
                          { label: "Won",    value: won },
                        ].map(s => (
                          <div key={s.label} className="rounded-lg bg-gray-50 dark:bg-white/5 px-2 py-2 text-center">
                            <p className="text-base font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                            <p className="text-[10px] text-gray-400">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Market Research */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[#C8102E] text-sm">✦</span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Market Research</h2>
              <span className="rounded-full border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/20 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-400">
                Per Property
              </span>
            </div>
            <p className="mb-4 -mt-2 text-xs text-gray-400">
              Claude analyzes rental market conditions for each property&apos;s zip code — rental rates, demand trends, competition.
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
              {properties.map(p => (
                <div key={p.id}
                  className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E]">
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{p.city}, {p.state} {p.zip}</p>
                    </div>
                    <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 shrink-0">
                      {p.city}, {p.state}
                    </span>
                  </div>
                  <MarketResearchCard property={p} onRun={runMarketResearch} />
                </div>
              ))}
            </div>
          </div>

          {/* Export section */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Export Performance Report</h3>
                <p className="mt-0.5 text-xs text-gray-400">Download a CSV of your lead and tour data</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">From</label>
                <input type="date" defaultValue={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">To</label>
                <input type="date" defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-300" />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  const rows = [
                    ["Property", "Total Leads", "Active", "Tours", "Won", "Conversion Rate"],
                    ...properties.map(p => {
                      const active = p.leads.filter(l => !["won","lost"].includes(l.status)).length;
                      const tours = p.leads.filter(l => l.status === "tour_scheduled").length;
                      const won = p.leads.filter(l => l.status === "won").length;
                      const conv = p.leads.length === 0 ? "0%" : `${Math.round((won / p.leads.length) * 100)}%`;
                      return [p.name, p.leads.length, active, tours, won, conv];
                    }),
                  ];
                  const csv = rows.map(r => r.join(",")).join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `leaseup_report_${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
