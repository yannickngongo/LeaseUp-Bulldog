"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getOperatorEmail } from "@/lib/demo-auth";

interface PortfolioProperty {
  id: string;
  name: string;
  city: string;
  state: string;
  total_units: number;
  occupied_units: number;
  active_leads: number;
  upcoming_renewals: number;
  monthly_revenue: number;
  campaign_active: boolean;
  risk: "critical" | "warning" | "healthy";
}

function occPct(p: PortfolioProperty) {
  if (!p.total_units) return 0;
  return Math.round((p.occupied_units / p.total_units) * 100);
}

function riskColor(risk: PortfolioProperty["risk"]) {
  if (risk === "critical") return { badge: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400", bar: "bg-red-500", border: "border-red-200 dark:border-red-900/40" };
  if (risk === "warning")  return { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", bar: "bg-amber-500", border: "border-amber-100 dark:border-amber-900/20" };
  return { badge: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400", bar: "bg-green-500", border: "border-gray-100 dark:border-white/5" };
}

function computeRisk(p: { total_units: number; occupied_units: number; upcoming_renewals: number }): PortfolioProperty["risk"] {
  const occ = p.total_units ? (p.occupied_units / p.total_units) * 100 : 100;
  if (occ < 80 || p.upcoming_renewals > 5) return "critical";
  if (occ < 90 || p.upcoming_renewals > 2) return "warning";
  return "healthy";
}

function OccBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-green-500" : pct >= 80 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full rounded-full bg-gray-100 dark:bg-white/5 h-1.5">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function PropertyCard({ p, view }: { p: PortfolioProperty; view: "grid" | "list" }) {
  const occ = occPct(p);
  const rc  = riskColor(p.risk);
  const vacant = p.total_units - p.occupied_units;

  if (view === "list") {
    return (
      <Link href={`/properties/${p.id}`} className={`flex items-center gap-4 rounded-xl border bg-white dark:bg-[#1C1F2E] px-5 py-4 hover:shadow-md transition-all ${rc.border}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${rc.badge}`}>{p.risk}</span>
            {p.campaign_active && <span className="shrink-0 rounded-full bg-[#C8102E]/10 text-[#C8102E] px-2 py-0.5 text-[9px] font-bold">CAMPAIGN ON</span>}
          </div>
          <p className="text-xs text-gray-400">{p.city}, {p.state}</p>
        </div>
        <div className="hidden sm:grid grid-cols-4 gap-6 text-center shrink-0">
          <div><p className={`text-lg font-black ${occ >= 90 ? "text-green-600 dark:text-green-400" : occ >= 80 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{occ}%</p><p className="text-[9px] text-gray-400">Occupancy</p></div>
          <div><p className="text-lg font-black text-gray-700 dark:text-gray-200">{vacant}</p><p className="text-[9px] text-gray-400">Vacant</p></div>
          <div><p className="text-lg font-black text-gray-700 dark:text-gray-200">{p.active_leads}</p><p className="text-[9px] text-gray-400">Leads</p></div>
          <div><p className="text-lg font-black text-gray-700 dark:text-gray-200">{p.upcoming_renewals}</p><p className="text-[9px] text-gray-400">Renewals</p></div>
        </div>
        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    );
  }

  return (
    <Link href={`/properties/${p.id}`} className={`block rounded-2xl border bg-white dark:bg-[#1C1F2E] p-5 hover:shadow-md transition-all ${rc.border}`}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{p.city}, {p.state}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${rc.badge}`}>{p.risk}</span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Occupancy</span>
          <span className={`font-bold ${occ >= 90 ? "text-green-600 dark:text-green-400" : occ >= 80 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{occ}%</span>
        </div>
        <OccBar pct={occ} />
        <p className="text-[10px] text-gray-400 mt-1">{p.occupied_units}/{p.total_units} units · {vacant} vacant</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { v: p.active_leads,       l: "Active Leads" },
          { v: p.upcoming_renewals,  l: "Renewals" },
          { v: `$${Math.round(p.monthly_revenue / 1000)}K`, l: "Monthly Rev." },
        ].map(({ v, l }) => (
          <div key={l} className="rounded-lg bg-gray-50 dark:bg-white/5 p-2 text-center">
            <p className="text-sm font-black text-gray-700 dark:text-gray-200">{v}</p>
            <p className="text-[9px] text-gray-400">{l}</p>
          </div>
        ))}
      </div>

      {p.campaign_active && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#C8102E]/5 px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E] animate-pulse" />
          <span className="text-[10px] font-semibold text-[#C8102E]">Ad campaign running</span>
        </div>
      )}
    </Link>
  );
}

export default function PortfolioPage() {
  const [properties, setProperties] = useState<PortfolioProperty[]>([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState<"grid" | "list">("grid");
  const [sort, setSort]             = useState<"risk" | "occupancy" | "revenue" | "name">("risk");
  const [filter, setFilter]         = useState<"all" | "critical" | "warning" | "healthy">("all");

  useEffect(() => {
    getOperatorEmail().then(email => {
      if (!email) { setLoading(false); return; }
      fetch(`/api/setup?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(async d => {
          const opId = d.operator?.id;
          if (!opId) { setLoading(false); return; }

          const [propsRes, leadsRes] = await Promise.all([
            fetch(`/api/properties?operator_id=${opId}`),
            fetch(`/api/leads?operator_id=${opId}&limit=500`),
          ]);
          const propsData = await propsRes.json();
          const leadsData = await leadsRes.json();

          const leads: { property_id?: string; status?: string }[] = leadsData.leads ?? [];

          const mapped: PortfolioProperty[] = (propsData.properties ?? []).map((p: {
            id: string; name: string; city: string; state: string;
            total_units?: number; occupied_units?: number; avg_rent?: number;
          }) => {
            const total    = p.total_units    ?? 0;
            const occupied = p.occupied_units ?? 0;
            const propLeads = leads.filter(l => l.property_id === p.id);
            const active    = propLeads.filter(l => !["won","lost"].includes(l.status ?? "")).length;
            const monthlyRev = occupied * (p.avg_rent ?? 1200);
            const renewals  = Math.max(0, Math.floor((total - occupied) * 0.3));
            const risk      = computeRisk({ total_units: total, occupied_units: occupied, upcoming_renewals: renewals });

            return {
              id: p.id, name: p.name, city: p.city ?? "", state: p.state ?? "",
              total_units: total, occupied_units: occupied,
              active_leads: active, upcoming_renewals: renewals,
              monthly_revenue: monthlyRev, campaign_active: active > 5,
              risk,
            } satisfies PortfolioProperty;
          });

          setProperties(mapped);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  const SORT_ORDER: Record<PortfolioProperty["risk"], number> = { critical: 0, warning: 1, healthy: 2 };

  const sorted = [...properties]
    .filter(p => filter === "all" || p.risk === filter)
    .sort((a, b) => {
      if (sort === "risk")      return SORT_ORDER[a.risk] - SORT_ORDER[b.risk];
      if (sort === "occupancy") return occPct(a) - occPct(b);
      if (sort === "revenue")   return b.monthly_revenue - a.monthly_revenue;
      return a.name.localeCompare(b.name);
    });

  const totals = {
    properties: properties.length,
    units:      properties.reduce((s, p) => s + p.total_units, 0),
    occupied:   properties.reduce((s, p) => s + p.occupied_units, 0),
    leads:      properties.reduce((s, p) => s + p.active_leads, 0),
    revenue:    properties.reduce((s, p) => s + p.monthly_revenue, 0),
  };
  const portfolioOcc = totals.units > 0 ? Math.round((totals.occupied / totals.units) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0E1017]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Portfolio Overview</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">All properties ranked by urgency — focus where it matters most</p>
          </div>
          <Link href="/properties/new" className="inline-flex items-center gap-2 rounded-xl bg-[#C8102E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors">
            + Add Property
          </Link>
        </div>

        {/* Portfolio KPIs */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Properties",     value: totals.properties,                                                  color: "text-gray-900 dark:text-gray-100" },
            { label: "Total Units",    value: totals.units,                                                        color: "text-gray-900 dark:text-gray-100" },
            { label: "Portfolio Occ.", value: `${portfolioOcc}%`,                                                  color: portfolioOcc >= 90 ? "text-green-600 dark:text-green-400" : portfolioOcc >= 80 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400" },
            { label: "Active Leads",   value: totals.leads,                                                        color: "text-[#C8102E]" },
            { label: "Monthly Rev.",   value: `$${(totals.revenue / 1000).toFixed(0)}K`,                          color: "text-gray-900 dark:text-gray-100" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {(["all","critical","warning","healthy"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  filter === f ? "bg-[#C8102E] text-white" : "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400"
                }`}
              >{f === "all" ? "All" : f}</button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none">
              <option value="risk">Sort: Risk</option>
              <option value="occupancy">Sort: Occupancy</option>
              <option value="revenue">Sort: Revenue</option>
              <option value="name">Sort: Name</option>
            </select>
            <div className="flex rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
              {(["grid","list"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${view === v ? "bg-gray-900 dark:bg-white/20 text-white" : "bg-white dark:bg-transparent text-gray-500 dark:text-gray-400"}`}>
                  {v === "grid" ? "⊞" : "☰"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Properties */}
        {loading ? (
          <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] py-16 text-center">
            <p className="text-4xl mb-3">🏢</p>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No properties yet</p>
            <Link href="/properties/new" className="mt-4 inline-block rounded-lg bg-[#C8102E] px-4 py-2 text-sm font-bold text-white hover:bg-[#A50D25]">Add your first property</Link>
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map(p => <PropertyCard key={p.id} p={p} view="grid" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map(p => <PropertyCard key={p.id} p={p} view="list" />)}
          </div>
        )}
      </div>
    </div>
  );
}
