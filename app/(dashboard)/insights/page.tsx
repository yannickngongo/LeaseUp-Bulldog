"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getOperatorEmail } from "@/lib/demo-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeekData    { label: string; count: number; }
interface SourceData  { name: string;  count: number; }
interface FunnelStage { status: string; count: number; }
interface PropertyData {
  id: string; name: string; city: string; state: string;
  total_units: number; occupied_units: number;
}

interface InsightsData {
  weeks:            WeekData[];
  sources:          SourceData[];
  funnel:           FunnelStage[];
  estimatedRevenue: number;
  totalUnits:       number;
  occupiedCount:    number;
  portfolioOccPct:  number | null;
  aiReplies:        number;
  humanTakes:       number;
  toursBooked:      number;
  totalLeads:       number;
  activeLeads:      number;
  wonLeads:         number;
  lostLeads:        number;
  properties:       PropertyData[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 dark:bg-white/5 ${className ?? ""}`} />;
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function LeadVolumeChart({ weeks }: { weeks: WeekData[] }) {
  const maxCount = Math.max(...weeks.map((w) => w.count), 1);
  const W = 560; const H = 160;
  const PAD = { top: 16, right: 8, bottom: 36, left: 32 };
  const cW  = W - PAD.left - PAD.right;
  const cH  = H - PAD.top  - PAD.bottom;
  const gap  = cW / weeks.length;
  const barW = gap * 0.55;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const v = Math.round(maxCount * pct);
        const y = PAD.top + cH - pct * cH;
        return (
          <g key={pct}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(150,150,150,0.1)" strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{v}</text>
          </g>
        );
      })}
      {weeks.map((w, i) => {
        const x    = PAD.left + i * gap + gap / 2 - barW / 2;
        const barH = Math.max(2, (w.count / maxCount) * cH);
        const y    = PAD.top + cH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill="#C8102E" fillOpacity={0.85} />
            {w.count > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#C8102E" fontWeight="700">{w.count}</text>
            )}
            <text
              x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={8.5} fill="#9ca3af"
              transform={`rotate(-35, ${x + barW / 2}, ${H - 6})`}
            >{w.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Funnel ───────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", engaged: "Engaged",
  tour_scheduled: "Toured", applied: "Applied", won: "Leased",
};
const STAGE_COLORS = ["bg-indigo-400","bg-sky-400","bg-violet-400","bg-amber-400","bg-orange-400","bg-green-500"];

function ConversionFunnel({ funnel }: { funnel: FunnelStage[] }) {
  const top = funnel[0]?.count ?? 1;
  return (
    <div className="space-y-2.5">
      {funnel.map((stage, i) => {
        const pct  = top > 0 ? Math.round((stage.count / top) * 100) : 0;
        const prev = funnel[i - 1]?.count ?? stage.count;
        const drop = i > 0 && prev > 0 ? Math.round((stage.count / prev) * 100) : 100;
        return (
          <div key={stage.status}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">{STAGE_LABELS[stage.status] ?? stage.status}</span>
              <div className="flex items-center gap-2">
                {i > 0 && (
                  <span className={`text-[10px] font-semibold ${drop >= 50 ? "text-green-600" : drop >= 25 ? "text-amber-600" : "text-red-500"}`}>
                    {drop}% kept
                  </span>
                )}
                <span className="w-5 text-right font-bold tabular-nums text-gray-900 dark:text-gray-100">{stage.count}</span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              <div className={`h-full rounded-full ${STAGE_COLORS[i] ?? "bg-gray-400"} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [data, setData]       = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const em = await getOperatorEmail();
      if (!em) return;
      setEmail(em);
      const res  = await fetch(`/api/insights?email=${encodeURIComponent(em)}`);
      const json = await res.json();
      if (json.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 p-4 lg:p-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Portfolio Insights</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">Analytics and performance across all properties</p>
        </div>
        <Link href="/reports"
          className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Owner Reports →
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : data ? (
          [
            { label: "Total Leads",          value: fmt(data.totalLeads),    sub: `${data.activeLeads} active`,             color: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-50 dark:bg-indigo-900/20" },
            { label: "Leases Signed",         value: fmt(data.wonLeads),      sub: "converted via LUB",                      color: "text-green-600 dark:text-green-400",     bg: "bg-green-50 dark:bg-green-900/20" },
            { label: "AI Replies (30d)",      value: fmt(data.aiReplies),     sub: "fully automated",                        color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-900/20" },
            { label: "Est. Monthly Revenue",  value: `$${data.estimatedRevenue.toLocaleString()}`, sub: `${data.occupiedCount}/${data.totalUnits} units`, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E]">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{k.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{k.value}</p>
              <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{k.sub}</p>
              <div className="mt-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${k.bg} ${k.color}`}>
                  ↑ this period
                </span>
              </div>
            </div>
          ))
        ) : null}
      </div>

      {/* Lead Volume + Source */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Lead Volume — Last 12 Weeks</p>
              <p className="mt-0.5 text-xs text-gray-400">New leads per week across all properties</p>
            </div>
            {data && <span className="rounded-full bg-[#C8102E]/10 px-2.5 py-0.5 text-xs font-bold text-[#C8102E]">{data.totalLeads} total</span>}
          </div>
          {loading ? <Skeleton className="h-40" /> : data ? <LeadVolumeChart weeks={data.weeks} /> : null}
          {data && (
            <div className="mt-3 flex gap-6 border-t border-gray-50 pt-3 dark:border-white/5">
              {[
                { label: "Peak Week",  value: Math.max(...data.weeks.map((w) => w.count)) },
                { label: "Avg/Week",   value: Math.round(data.totalLeads / 12) },
                { label: "This Week",  value: data.weeks[data.weeks.length - 1]?.count ?? 0 },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] text-gray-400">{s.label}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <p className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Lead Sources</p>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
          ) : data && data.sources.length > 0 ? (
            <div className="space-y-3">
              {data.sources.map((s) => {
                const pct = Math.round((s.count / (data.totalLeads || 1)) * 100);
                return (
                  <div key={s.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="max-w-[140px] truncate font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
                      <span className="ml-2 font-bold text-gray-900 dark:text-gray-100">{s.count} <span className="font-normal text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div className="h-full rounded-full bg-[#C8102E]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-gray-400">No source data yet.</p>
          )}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Funnel */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <p className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Conversion Funnel</p>
          {loading
            ? <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
            : data ? <ConversionFunnel funnel={data.funnel} />
            : null}
          {data && data.wonLeads > 0 && data.totalLeads > 0 && (
            <div className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-center dark:bg-green-900/10">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                {Math.round((data.wonLeads / data.totalLeads) * 100)}% overall conversion
              </p>
            </div>
          )}
        </div>

        {/* Property Health */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <p className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Properties — Occupancy</p>
          {loading
            ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : data && data.properties.length > 0
            ? (
              <div className="space-y-2">
                {data.properties.map((p) => {
                  const occ = p.total_units > 0 ? Math.round((p.occupied_units / p.total_units) * 100) : null;
                  return (
                    <Link key={p.id} href={`/properties/${p.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        occ === null ? "bg-gray-100 text-gray-400 dark:bg-white/10"
                        : occ >= 90  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : occ >= 75  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>{occ !== null ? `${occ}%` : "—"}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                          {occ !== null && <div className={`h-full rounded-full ${occ >= 90 ? "bg-green-500" : occ >= 75 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${occ}%` }} />}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
            : <p className="py-6 text-center text-sm text-gray-400">No properties yet.</p>}
        </div>

        {/* AI Stats */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <p className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">AI Performance — 30 Days</p>
          {loading
            ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : data
            ? (
              <div className="space-y-2.5">
                {[
                  { label: "AI Replies Sent",  value: fmt(data.aiReplies),   icon: "💬", color: "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400" },
                  { label: "Tours Booked",      value: fmt(data.toursBooked), icon: "📅", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
                  { label: "Human Takeovers",   value: fmt(data.humanTakes),  icon: "👤", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
                  { label: "Leases Converted",  value: fmt(data.wonLeads),    icon: "🎉", color: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
                ].map((s) => (
                  <div key={s.label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${s.color}`}>
                    <span className="text-lg">{s.icon}</span>
                    <p className="flex-1 text-xs font-medium opacity-80">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                ))}
                {data.aiReplies > 0 && (
                  <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 dark:border-violet-900/20 dark:bg-violet-900/10">
                    <p className="text-xs leading-relaxed text-violet-700 dark:text-violet-400">
                      LUB AI handled <strong>{fmt(data.aiReplies)}</strong> conversations automatically — saving ~<strong>{Math.round(data.aiReplies * 4)} minutes</strong> of manual follow-up.
                    </p>
                  </div>
                )}
              </div>
            )
            : null}
        </div>
      </div>
    </div>
  );
}
