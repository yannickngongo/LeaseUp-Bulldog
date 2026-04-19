"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthStatus = "on_track" | "at_risk" | "needs_attention";
type SortKey = "name" | "occupancy" | "available" | "leads" | "tour_rate" | "app_rate";
type SortDir = "asc" | "desc";
type FilterStatus = "all" | "on_track" | "at_risk" | "needs_attention";

interface Property {
  id: string;
  name: string;
  city: string;
  state: string;
  units: number;
  occupied: number;
  leads_this_week: number;
  tours_this_week: number;
  applications_this_week: number;
  ai_number: string;
  active_special?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PROPERTIES: Property[] = [
  {
    id: "prop-1",
    name: "The Monroe",
    city: "Las Vegas",
    state: "NV",
    units: 48,
    occupied: 43,
    leads_this_week: 9,
    tours_this_week: 4,
    applications_this_week: 2,
    ai_number: "+17025550100",
    active_special: "1 month free on 12-month leases",
  },
  {
    id: "prop-2",
    name: "Parkview Commons",
    city: "Henderson",
    state: "NV",
    units: 72,
    occupied: 63,
    leads_this_week: 6,
    tours_this_week: 2,
    applications_this_week: 1,
    ai_number: "+17025550200",
  },
  {
    id: "prop-3",
    name: "Sonoran Ridge",
    city: "Scottsdale",
    state: "AZ",
    units: 120,
    occupied: 109,
    leads_this_week: 14,
    tours_this_week: 7,
    applications_this_week: 4,
    ai_number: "+16025550300",
    active_special: "$500 off first month — ends Apr 30",
  },
  {
    id: "prop-4",
    name: "Vista on 5th",
    city: "Phoenix",
    state: "AZ",
    units: 64,
    occupied: 41,
    leads_this_week: 3,
    tours_this_week: 1,
    applications_this_week: 0,
    ai_number: "+16025550401",
  },
  {
    id: "prop-5",
    name: "Creekside at Summerlin",
    city: "Las Vegas",
    state: "NV",
    units: 96,
    occupied: 91,
    leads_this_week: 8,
    tours_this_week: 5,
    applications_this_week: 3,
    ai_number: "+17025550502",
  },
  {
    id: "prop-6",
    name: "Desert Bloom",
    city: "Tucson",
    state: "AZ",
    units: 54,
    occupied: 37,
    leads_this_week: 2,
    tours_this_week: 1,
    applications_this_week: 0,
    ai_number: "+15205550603",
    active_special: "App fee waived through Apr 25",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveHealth(occ: number, tourRate: number): HealthStatus {
  if (occ >= 90 && tourRate >= 30) return "on_track";
  if (occ >= 78 || (occ >= 70 && tourRate >= 20)) return "at_risk";
  return "needs_attention";
}

function pct(a: number, b: number) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const HEALTH_STYLES: Record<HealthStatus, { bg: string; text: string; dot: string; label: string }> = {
  on_track:        { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500",  label: "On Track" },
  at_risk:         { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400",  label: "At Risk" },
  needs_attention: { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500",    label: "Needs Attention" },
};

function HealthBadge({ status }: { status: HealthStatus }) {
  const s = HEALTH_STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", s.bg, s.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function OccupancyBar({ pct, compact = false }: { pct: number; compact?: boolean }) {
  const color = pct >= 90 ? "bg-green-500" : pct >= 78 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className={cn("overflow-hidden rounded-full bg-gray-100", compact ? "h-1" : "h-1.5")}>
      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <svg className="h-3.5 w-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
  return dir === "asc" ? (
    <svg className="h-3.5 w-3.5 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="h-3.5 w-3.5 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilter]     = useState<FilterStatus>("all");
  const [sortKey, setSortKey]         = useState<SortKey>("occupancy");
  const [sortDir, setSortDir]         = useState<SortDir>("desc");
  const [view, setView]               = useState<"table" | "cards">("table");

  // Enrich properties with derived metrics
  const enriched = useMemo(() => MOCK_PROPERTIES.map((p) => {
    const occupancyPct = pct(p.occupied, p.units);
    const available    = p.units - p.occupied;
    const tourRate     = pct(p.tours_this_week, p.leads_this_week);
    const appRate      = pct(p.applications_this_week, Math.max(p.tours_this_week, 1));
    const health       = deriveHealth(occupancyPct, tourRate);
    return { ...p, occupancyPct, available, tourRate, appRate, health };
  }), []);

  // Portfolio totals
  const totals = useMemo(() => ({
    units:       enriched.reduce((a, p) => a + p.units, 0),
    occupied:    enriched.reduce((a, p) => a + p.occupied, 0),
    leads:       enriched.reduce((a, p) => a + p.leads_this_week, 0),
    tours:       enriched.reduce((a, p) => a + p.tours_this_week, 0),
    apps:        enriched.reduce((a, p) => a + p.applications_this_week, 0),
    onTrack:     enriched.filter((p) => p.health === "on_track").length,
    atRisk:      enriched.filter((p) => p.health === "at_risk").length,
    needsHelp:   enriched.filter((p) => p.health === "needs_attention").length,
  }), [enriched]);

  const portfolioOcc = pct(totals.occupied, totals.units);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = enriched;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      list = list.filter((p) => p.health === filterStatus);
    }
    return [...list].sort((a, b) => {
      let av = 0, bv = 0;
      if (sortKey === "name")        { av = a.name.localeCompare(b.name); return sortDir === "asc" ? av : -av; }
      if (sortKey === "occupancy")   { av = a.occupancyPct; bv = b.occupancyPct; }
      if (sortKey === "available")   { av = a.available;    bv = b.available;    }
      if (sortKey === "leads")       { av = a.leads_this_week; bv = b.leads_this_week; }
      if (sortKey === "tour_rate")   { av = a.tourRate;     bv = b.tourRate;     }
      if (sortKey === "app_rate")    { av = a.appRate;      bv = b.appRate;      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [enriched, search, filterStatus, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const FILTER_PILLS: { key: FilterStatus; label: string; count: number }[] = [
    { key: "all",              label: "All",             count: enriched.length },
    { key: "on_track",         label: "On Track",        count: totals.onTrack },
    { key: "at_risk",          label: "At Risk",         count: totals.atRisk },
    { key: "needs_attention",  label: "Needs Attention", count: totals.needsHelp },
  ];

  const COL_HEADERS: { key: SortKey; label: string; align?: string }[] = [
    { key: "name",      label: "Property",      align: "text-left" },
    { key: "occupancy", label: "Occupancy",     align: "text-right" },
    { key: "available", label: "Available",     align: "text-right" },
    { key: "leads",     label: "Leads / wk",   align: "text-right" },
    { key: "tour_rate", label: "Tour Rate",     align: "text-right" },
    { key: "app_rate",  label: "App Rate",      align: "text-right" },
  ];

  return (
    <div className="space-y-6 p-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Properties</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {enriched.length} communities · {totals.units} total units
          </p>
        </div>
        <Link
          href="/properties/new"
          className="rounded-lg bg-[#C8102E] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#A50D25]"
        >
          + Add Property
        </Link>
      </div>

      {/* ── Portfolio summary row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: "Portfolio Occupancy", value: `${portfolioOcc}%`,           sub: `${totals.occupied} / ${totals.units} units` },
          { label: "Available Units",     value: `${totals.units - totals.occupied}`, sub: "vacant now" },
          { label: "Leads This Week",     value: `${totals.leads}`,            sub: "across all" },
          { label: "Tours This Week",     value: `${totals.tours}`,            sub: "scheduled" },
          { label: "Applications",        value: `${totals.apps}`,             sub: "this week" },
          { label: "Portfolio Tour Rate", value: `${pct(totals.tours, totals.leads)}%`, sub: "leads → tours" },
        ].map((s) => (
          <Card key={s.label} padding="sm">
            <p className="text-[11px] font-medium text-gray-400">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* ── Health strip ─────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <div className="flex flex-1 overflow-hidden rounded-lg border border-gray-100 bg-white">
          {(
            [
              { health: "on_track"        as HealthStatus, count: totals.onTrack,  color: "bg-green-500" },
              { health: "at_risk"         as HealthStatus, count: totals.atRisk,   color: "bg-amber-400" },
              { health: "needs_attention" as HealthStatus, count: totals.needsHelp, color: "bg-red-400" },
            ] as const
          ).map((seg) => (
            <button
              key={seg.health}
              onClick={() => setFilter(filterStatus === seg.health ? "all" : seg.health)}
              style={{ flex: seg.count }}
              className={cn(
                "flex flex-col items-center justify-center py-3 text-xs transition-colors",
                filterStatus === seg.health ? "opacity-100" : "opacity-70 hover:opacity-90"
              )}
            >
              <div className={cn("mb-1 h-1 w-full rounded-full", seg.color)} />
              <span className="font-semibold text-gray-900">{seg.count}</span>
              <span className="text-[10px] text-gray-400">{HEALTH_STYLES[seg.health].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search properties…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs text-gray-700 placeholder-gray-400 outline-none focus:border-gray-400 focus:ring-0"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5">
          {FILTER_PILLS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                filterStatus === f.key
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              {f.label}
              {f.key !== "all" && (
                <span className={cn("ml-1.5 text-[10px]", filterStatus === f.key ? "text-gray-300" : "text-gray-400")}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="ml-auto flex rounded-lg border border-gray-200 bg-white p-0.5">
          {(["table", "cards"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                view === v ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {v === "table" ? (
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M3 6h18M3 18h18" />
                  </svg>
                  Table
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zM14 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V6zM4 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2zM14 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z" />
                  </svg>
                  Cards
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table view ───────────────────────────────────────────────────── */}
      {view === "table" && (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {COL_HEADERS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      "cursor-pointer select-none px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-700",
                      col.align ?? "text-left"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </span>
                  </th>
                ))}
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((prop) => (
                <tr key={prop.id} className="group transition-colors hover:bg-gray-50/60">
                  {/* Name */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{prop.name}</span>
                      <span className="mt-0.5 text-[11px] text-gray-400">
                        {prop.city}, {prop.state}
                        {prop.active_special && (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Special
                          </span>
                        )}
                      </span>
                    </div>
                  </td>

                  {/* Occupancy */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold text-gray-900">{prop.occupancyPct}%</span>
                      <div className="w-24">
                        <OccupancyBar pct={prop.occupancyPct} compact />
                      </div>
                      <span className="text-[11px] text-gray-400">{prop.occupied}/{prop.units}</span>
                    </div>
                  </td>

                  {/* Available */}
                  <td className="px-5 py-4 text-right">
                    <span className={cn(
                      "text-sm font-semibold",
                      prop.available > 10 ? "text-red-500" : prop.available > 5 ? "text-amber-600" : "text-gray-700"
                    )}>
                      {prop.available}
                    </span>
                    <span className="ml-1 text-[11px] text-gray-400">units</span>
                  </td>

                  {/* Leads */}
                  <td className="px-5 py-4 text-right">
                    <span className="font-semibold text-gray-900">{prop.leads_this_week}</span>
                  </td>

                  {/* Tour rate */}
                  <td className="px-5 py-4 text-right">
                    <span className={cn(
                      "font-semibold",
                      prop.tourRate >= 40 ? "text-green-600" : prop.tourRate >= 20 ? "text-gray-900" : "text-red-500"
                    )}>
                      {prop.tourRate}%
                    </span>
                  </td>

                  {/* App rate */}
                  <td className="px-5 py-4 text-right">
                    <span className={cn(
                      "font-semibold",
                      prop.appRate >= 30 ? "text-green-600" : prop.appRate >= 15 ? "text-gray-900" : "text-red-500"
                    )}>
                      {prop.appRate}%
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 text-right">
                    <HealthBadge status={prop.health} />
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Link
                        href={`/leads?property=${prop.id}`}
                        className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-100"
                      >
                        Leads
                      </Link>
                      <Link
                        href={`/properties/${prop.id}`}
                        className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#C8102E] transition-colors hover:bg-red-50"
                      >
                        Detail →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-400">No properties match your search.</p>
            </div>
          )}

          <div className="border-t border-gray-50 px-5 py-3 text-[11px] text-gray-400">
            Showing {filtered.length} of {enriched.length} properties
          </div>
        </Card>
      )}

      {/* ── Card view ────────────────────────────────────────────────────── */}
      {view === "cards" && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((prop) => (
            <Card key={prop.id} padding="none">
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-gray-900">{prop.name}</h3>
                    <p className="mt-0.5 text-xs text-gray-400">{prop.city}, {prop.state}</p>
                  </div>
                  <HealthBadge status={prop.health} />
                </div>

                {/* Occupancy bar */}
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Occupancy</span>
                    <span className="text-sm font-bold text-gray-900">{prop.occupancyPct}%</span>
                  </div>
                  <OccupancyBar pct={prop.occupancyPct} />
                  <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                    <span>{prop.occupied}/{prop.units} units</span>
                    <span className={prop.available > 5 ? "font-medium text-amber-600" : ""}>
                      {prop.available} available
                    </span>
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-50 pt-4">
                  {[
                    { label: "Leads / wk",  value: prop.leads_this_week },
                    { label: "Tour Rate",   value: `${prop.tourRate}%`,  color: prop.tourRate >= 30 ? "text-green-600" : prop.tourRate < 15 ? "text-red-500" : undefined },
                    { label: "App Rate",    value: `${prop.appRate}%`,   color: prop.appRate >= 25 ? "text-green-600" : prop.appRate === 0 ? "text-red-500" : undefined },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <p className="text-[10px] text-gray-400">{m.label}</p>
                      <p className={cn("mt-0.5 text-lg font-bold text-gray-900", m.color)}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Special */}
                {prop.active_special && (
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                    Special: {prop.active_special}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-50 px-5 py-3">
                <Link
                  href={`/leads?property=${prop.id}`}
                  className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-800"
                >
                  View leads →
                </Link>
                <Link
                  href={`/properties/${prop.id}`}
                  className="text-xs font-medium text-[#C8102E] hover:underline"
                >
                  Property detail →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filtered.length === 0 && view === "cards" && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center">
          <p className="text-sm text-gray-400">No properties match your search.</p>
        </div>
      )}
    </div>
  );
}
