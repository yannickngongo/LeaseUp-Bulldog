"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/demo-auth";
import { EmptyState, EmptyIcons } from "@/components/ui/EmptyState";
import { SkeletonStatGrid, SkeletonList } from "@/components/ui/Skeleton";

interface Performance {
  days:           number;
  leadVolume:     number;
  bySource:       { source: string; count: number }[];
  byStatus:       { status: string; count: number }[];
  avgResponseSec: number | null;
  conversion:     { newToWon: number; newToWonPct: number };
  leases:         { count: number; billable: number; totalRent: number; totalFees: number };
}

const RANGES = [
  { value: 7,   label: "Last 7 days"  },
  { value: 30,  label: "Last 30 days" },
  { value: 90,  label: "Last 90 days" },
  { value: 365, label: "Last year"    },
];

function fmtDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60)    return `${seconds}s`;
  if (seconds < 3600)  return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} hr`;
}

function fmtCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

const STATUS_COLORS: Record<string, string> = {
  new:        "bg-blue-500",
  contacted:  "bg-cyan-500",
  qualified:  "bg-emerald-500",
  toured:     "bg-violet-500",
  applied:    "bg-amber-500",
  won:        "bg-green-600",
  lost:       "bg-gray-400",
  unsubscribed: "bg-gray-400",
};

export default function PerformancePage() {
  const [days,    setDays]    = useState(30);
  const [data,    setData]    = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authFetch(`/api/analytics/performance?days=${days}`)
      .then(r => r.json())
      .then(j => setData(j as Performance))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Performance</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Lead volume, response time, conversion, and lease attribution</p>
          </div>
          <div className="flex gap-1">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  days === r.value
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >{r.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <SkeletonStatGrid count={4} />
            <SkeletonList count={2} />
          </div>
        ) : !data || data.leadVolume === 0 ? (
          <EmptyState
            icon={EmptyIcons.reports}
            title={`No data yet${days < 30 ? "" : " for this period"}`}
            description="Once leads start flowing in, you'll see volume, response time, conversion rate, and lease attribution here. Check back tomorrow if you set up integrations today."
          />
        ) : (
          <>
            {/* Top stats */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Leads received"   value={data.leadVolume.toLocaleString()} note={`Last ${data.days} days`} />
              <Stat label="Avg AI response"  value={fmtDuration(data.avgResponseSec)} note="Time to first AI text" tone={data.avgResponseSec != null && data.avgResponseSec <= 90 ? "good" : "neutral"} />
              <Stat label="Conversion"       value={`${data.conversion.newToWonPct.toFixed(1)}%`} note={`${data.conversion.newToWon} leases from ${data.leadVolume} leads`} />
              <Stat label="Performance fees" value={fmtCents(data.leases.totalFees)} note={`${data.leases.billable} billable lease${data.leases.billable === 1 ? "" : "s"}`} />
            </div>

            {/* Source breakdown */}
            <div className="mb-6 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">Where leads came from</p>
              {data.bySource.length === 0 ? (
                <p className="text-sm text-gray-400">No sources to show.</p>
              ) : (
                <div className="space-y-2">
                  {data.bySource.map(s => {
                    const pct = (s.count / data.leadVolume) * 100;
                    return (
                      <div key={s.source}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">{s.source.replace(/_/g, " ")}</span>
                          <span className="text-gray-500 dark:text-gray-400">{s.count} leads · {pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
                          <div className="h-2 rounded-full bg-[#C8102E]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status pipeline */}
            <div className="mb-6 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">Lead pipeline by status</p>
              {data.byStatus.length === 0 ? (
                <p className="text-sm text-gray-400">No leads to show.</p>
              ) : (
                <div className="space-y-2">
                  {data.byStatus.map(s => {
                    const pct = (s.count / data.leadVolume) * 100;
                    const color = STATUS_COLORS[s.status] ?? "bg-gray-400";
                    return (
                      <div key={s.status}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">{s.status.replace(/_/g, " ")}</span>
                          <span className="text-gray-500 dark:text-gray-400">{s.count}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
                          <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lease detail */}
            <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Leases recorded this period</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{data.leases.count}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total leases</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-green-600 dark:text-green-400">{data.leases.billable}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">LUB-attributed</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{fmtCents(data.leases.totalRent)}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monthly rent total</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[#C8102E]">{fmtCents(data.leases.totalFees)}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Performance fees</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, note, tone = "neutral" }: { label: string; value: string; note: string; tone?: "good" | "neutral" }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-black ${tone === "good" ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-gray-100"}`}>{value}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{note}</p>
    </div>
  );
}
