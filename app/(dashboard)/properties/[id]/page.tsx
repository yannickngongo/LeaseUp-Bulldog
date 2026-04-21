"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone_number: string;
  active_special?: string;
  total_units?: number | null;
  occupied_units?: number | null;
  neighborhood?: string;
  website_url?: string;
  tour_booking_url?: string;
}

interface Lead {
  id: string;
  name: string;
  source?: string;
  status: string;
  ai_score?: number | null;
  created_at: string;
  updated_at: string;
  last_contacted_at?: string | null;
}

interface Unit {
  id?: string;
  unit_name: string;
  unit_type: string | null;
  bedrooms: number | null;
  sq_ft: number | null;
  status: string;
  current_resident: string;
  lease_start?: string;
  lease_end: string;
  monthly_rent: number | null;
  updated_at?: string;
}

interface OccupancyAnalysis {
  score: number;
  score_label: string;
  diagnosis: string[];
  market_analysis: string;
  suggestions: {
    priority: "high" | "medium" | "low";
    title: string;
    body: string;
    impact: string;
  }[];
}

interface ProjectionData {
  labels: string[];
  noAction: number[];
  withLUB: number[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function isTourOrBeyond(s: string)    { return ["tour_scheduled","applied","won"].includes(s); }
function isAppliedOrBeyond(s: string) { return ["applied","won"].includes(s); }

function scoreStyle(score: number) {
  if (score >= 90) return { text: "text-green-600",  bg: "bg-green-50  dark:bg-green-900/20",  ring: "ring-green-200  dark:ring-green-800",  bar: "bg-green-500"  };
  if (score >= 80) return { text: "text-blue-600",   bg: "bg-blue-50   dark:bg-blue-900/20",   ring: "ring-blue-200   dark:ring-blue-800",   bar: "bg-blue-500"   };
  if (score >= 70) return { text: "text-amber-600",  bg: "bg-amber-50  dark:bg-amber-900/20",  ring: "ring-amber-200  dark:ring-amber-800",  bar: "bg-amber-500"  };
  if (score >= 60) return { text: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20", ring: "ring-orange-200 dark:ring-orange-800", bar: "bg-orange-500" };
  return              { text: "text-red-600",    bg: "bg-red-50    dark:bg-red-900/20",    ring: "ring-red-200    dark:ring-red-800",    bar: "bg-red-500"    };
}

// Conservative multifamily digital ad benchmarks
const CPL           = 45;   // cost per lead
const LEAD_TO_LEASE = 0.20; // lead-to-lease conversion rate
const RENEWAL_BOOST = 0.82; // renewal rate with LUB active outreach

function recommendMonthlyBudget(occupied: number, totalUnits: number): number {
  const target = Math.ceil(totalUnits * 0.95);
  const gap    = Math.max(0, target - occupied);
  if (gap === 0) return 500;
  const leasesPerMonth = Math.ceil(gap / 2); // fill in 2 months
  return Math.max(500, Math.ceil((leasesPerMonth / LEAD_TO_LEASE) * CPL / 100) * 100);
}

interface BudgetProjection extends ProjectionData {
  leadsPerMonth: number;
  leasesPerMonth: number;
  daysTo95: number;
}

function computeBudgetProjection(units: Unit[], budgetPerMonth: number, totalUnits: number): BudgetProjection {
  const empty: BudgetProjection = { labels: ["Today","30d","60d","90d"], noAction: [0,0,0,0], withLUB: [0,0,0,0], leadsPerMonth: 0, leasesPerMonth: 0, daysTo95: 999 };
  if (totalUnits === 0) return empty;

  const now      = Date.now();
  const occupied = units.filter(u => u.status === "occupied").length;
  const notice   = units.filter(u => u.status === "notice").length;
  const currentPct = Math.round((occupied / totalUnits) * 100);
  const p = (n: number) => Math.min(100, Math.round((n / totalUnits) * 100));

  // Incremental expirations per window
  function expiringBy(days: number) {
    return units.filter(u => {
      if (u.status !== "occupied" || !u.lease_end) return false;
      const ms = new Date(u.lease_end).getTime() - now;
      return ms >= 0 && ms <= days * 86_400_000;
    }).length;
  }
  const exp30 = expiringBy(30);
  const exp60 = expiringBy(60) - exp30;
  const exp90 = expiringBy(90) - expiringBy(60);

  // ── WITHOUT AD SPEND ─────────────────────────────────────────────────────────
  // Honest decline: notice units vacate, leases expire, nothing fills
  const naOcc30 = Math.max(0, occupied - notice - exp30);
  const naOcc60 = Math.max(0, naOcc30 - exp60);
  const naOcc90 = Math.max(0, naOcc60 - exp90);

  // ── WITH AD BUDGET ────────────────────────────────────────────────────────────
  // New leases per month from ad spend (conservative CPL × lead-to-lease rate)
  const leadsPerMonth  = Math.round(budgetPerMonth / CPL);
  const leasesPerMonth = Math.round(leadsPerMonth * LEAD_TO_LEASE);

  // Churn still happens but LUB's renewal outreach improves retention
  const noticeVac = Math.round(notice * 0.35);               // LUB retains 65% of notice tenants
  const expVac30  = Math.round(exp30 * (1 - RENEWAL_BOOST));
  const expVac60  = Math.round(exp60 * (1 - RENEWAL_BOOST));
  const expVac90  = Math.round(exp90 * (1 - RENEWAL_BOOST));

  // Cumulative new leases by window
  const adIn30 = leasesPerMonth;
  const adIn60 = leasesPerMonth;
  const adIn90 = leasesPerMonth;

  const rawLub30 = occupied - noticeVac - expVac30 + adIn30;
  const lubOcc30 = Math.min(totalUnits, Math.max(occupied, rawLub30));

  const rawLub60 = lubOcc30 - expVac60 + adIn60;
  const lubOcc60 = Math.min(totalUnits, Math.max(lubOcc30, rawLub60));

  const rawLub90 = lubOcc60 - expVac90 + adIn90;
  const lubOcc90 = Math.min(totalUnits, Math.max(lubOcc60, rawLub90));

  // Days to 95% at current budget
  const target95    = Math.ceil(totalUnits * 0.95);
  const gap95       = Math.max(0, target95 - occupied);
  const avgChurn    = Math.round((noticeVac + expVac30 + expVac60 + expVac90) / 3);
  const netPerMonth = leasesPerMonth - avgChurn;
  const daysTo95    = gap95 === 0 ? 0 : netPerMonth > 0 ? Math.ceil((gap95 / netPerMonth) * 30) : 999;

  return {
    labels:       ["Today", "30 days", "60 days", "90 days"],
    noAction:     [currentPct, p(naOcc30), p(naOcc60), p(naOcc90)],
    withLUB:      [currentPct, p(lubOcc30), p(lubOcc60), p(lubOcc90)],
    leadsPerMonth,
    leasesPerMonth,
    daysTo95,
  };
}

const STATUS_COLORS: Record<string, string> = {
  occupied:    "bg-green-100 text-green-700",
  vacant:      "bg-gray-100  text-gray-600",
  notice:      "bg-amber-100 text-amber-700",
  unavailable: "bg-red-100   text-red-600",
};

const LEAD_STATUS_LABEL: Record<string, string> = {
  new: "New", contacted: "Contacted", engaged: "Engaged",
  tour_scheduled: "Tour Scheduled", applied: "Applied", won: "Won", lost: "Lost",
};

// ─── Occupancy Chart (SVG) ────────────────────────────────────────────────────

function OccupancyChart({ projection }: { projection: ProjectionData }) {
  const W = 560, H = 210;
  const PAD = { top: 24, right: 56, bottom: 40, left: 44 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top  - PAD.bottom;

  const all  = [...projection.noAction, ...projection.withLUB, 95];
  const minY = Math.max(0,   Math.min(...all) - 8);
  const maxY = Math.min(100, Math.max(...all) + 6);

  const xS = (i: number) => PAD.left + (i / 3) * cW;
  const yS = (v: number) => PAD.top  + cH - ((v - minY) / (maxY - minY)) * cH;

  const path = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join(" ");

  const t90   = yS(95);
  const show90 = t90 >= PAD.top && t90 <= H - PAD.bottom;

  // 5 y-axis grid steps
  const gridVals = Array.from({ length: 5 }, (_, i) =>
    Math.round(minY + ((maxY - minY) / 4) * i)
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Grid lines */}
      {gridVals.map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={yS(v)} x2={W - PAD.right} y2={yS(v)} stroke="rgba(150,150,150,0.15)" strokeWidth={1} />
          <text x={PAD.left - 6} y={yS(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">{v}%</text>
        </g>
      ))}

      {/* 95% target line */}
      {show90 && (
        <>
          <line x1={PAD.left} y1={t90} x2={W - PAD.right} y2={t90} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
          <text x={W - PAD.right + 6} y={t90 + 4} fontSize={10} fill="#f59e0b" fontWeight="700">95%</text>
        </>
      )}

      {/* Shaded area under withLUB */}
      <path
        d={`${path(projection.withLUB)} L${xS(3).toFixed(1)},${yS(minY).toFixed(1)} L${xS(0).toFixed(1)},${yS(minY).toFixed(1)} Z`}
        fill="#C8102E" fillOpacity={0.07}
      />

      {/* Without LUB (dashed) */}
      <path d={path(projection.noAction)} fill="none" stroke="#9ca3af" strokeWidth={2} strokeDasharray="6,3" />

      {/* With LUB (solid) */}
      <path d={path(projection.withLUB)} fill="none" stroke="#C8102E" strokeWidth={2.5} />

      {/* Data point labels — withLUB */}
      {projection.withLUB.map((v, i) => (
        <g key={i}>
          <circle cx={xS(i)} cy={yS(v)} r={5} fill="#C8102E" />
          <text x={xS(i)} y={yS(v) - 9} textAnchor="middle" fontSize={11} fill="#C8102E" fontWeight="700">{v}%</text>
        </g>
      ))}

      {/* Data point labels — noAction */}
      {projection.noAction.map((v, i) => (
        <g key={i}>
          <circle cx={xS(i)} cy={yS(v)} r={3.5} fill="white" stroke="#9ca3af" strokeWidth={1.5} />
          {i > 0 && (
            <text x={xS(i)} y={yS(v) + 16} textAnchor="middle" fontSize={10} fill="#9ca3af">{v}%</text>
          )}
        </g>
      ))}

      {/* X axis line */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="rgba(150,150,150,0.2)" strokeWidth={1} />

      {/* X labels */}
      {projection.labels.map((label, i) => (
        <text key={i} x={xS(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#6b7280">{label}</text>
      ))}

      {/* Legend */}
      <g transform={`translate(${PAD.left}, 4)`}>
        <rect x={0} y={0} width={14} height={3} fill="#C8102E" rx={1.5} />
        <text x={18} y={4} fontSize={10} fill="#6b7280">With ad spend</text>
        <line x1={106} y1={1.5} x2={120} y2={1.5} stroke="#9ca3af" strokeWidth={2} strokeDasharray="4,2" />
        <text x={124} y={4} fontSize={10} fill="#6b7280">No ad spend</text>
        {show90 && (
          <>
            <line x1={204} y1={1.5} x2={218} y2={1.5} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,2" />
            <text x={222} y={4} fontSize={10} fill="#f59e0b">95% target</text>
          </>
        )}
      </g>
    </svg>
  );
}

// ─── Mobile Occupancy Chart ───────────────────────────────────────────────────
// Larger viewBox + bigger fonts so it reads well at phone width (~350px)

function OccupancyChartMobile({ projection }: { projection: ProjectionData }) {
  const W = 340, H = 280;
  const PAD = { top: 36, right: 52, bottom: 48, left: 46 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top  - PAD.bottom;

  const all  = [...projection.noAction, ...projection.withLUB, 95];
  const minY = Math.max(0,   Math.min(...all) - 8);
  const maxY = Math.min(100, Math.max(...all) + 6);

  const xS = (i: number) => PAD.left + (i / 3) * cW;
  const yS = (v: number) => PAD.top  + cH - ((v - minY) / (maxY - minY)) * cH;

  const path = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join(" ");

  const t95   = yS(95);
  const show95 = t95 >= PAD.top && t95 <= H - PAD.bottom;

  const gridVals = Array.from({ length: 5 }, (_, i) =>
    Math.round(minY + ((maxY - minY) / 4) * i)
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Grid lines */}
      {gridVals.map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={yS(v)} x2={W - PAD.right} y2={yS(v)} stroke="rgba(150,150,150,0.15)" strokeWidth={1} />
          <text x={PAD.left - 6} y={yS(v) + 4} textAnchor="end" fontSize={12} fill="#9ca3af">{v}%</text>
        </g>
      ))}

      {/* 95% target line */}
      {show95 && (
        <>
          <line x1={PAD.left} y1={t95} x2={W - PAD.right} y2={t95} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
          <text x={W - PAD.right + 5} y={t95 + 4} fontSize={12} fill="#f59e0b" fontWeight="700">95%</text>
        </>
      )}

      {/* Shaded area under withLUB */}
      <path
        d={`${path(projection.withLUB)} L${xS(3).toFixed(1)},${yS(minY).toFixed(1)} L${xS(0).toFixed(1)},${yS(minY).toFixed(1)} Z`}
        fill="#C8102E" fillOpacity={0.08}
      />

      {/* No spend (dashed) */}
      <path d={path(projection.noAction)} fill="none" stroke="#9ca3af" strokeWidth={2} strokeDasharray="6,3" />

      {/* With spend (solid) */}
      <path d={path(projection.withLUB)} fill="none" stroke="#C8102E" strokeWidth={3} />

      {/* Data labels — withLUB */}
      {projection.withLUB.map((v, i) => (
        <g key={i}>
          <circle cx={xS(i)} cy={yS(v)} r={6} fill="#C8102E" />
          <text x={xS(i)} y={yS(v) - 11} textAnchor="middle" fontSize={13} fill="#C8102E" fontWeight="800">{v}%</text>
        </g>
      ))}

      {/* Data labels — noAction */}
      {projection.noAction.map((v, i) => (
        <g key={i}>
          <circle cx={xS(i)} cy={yS(v)} r={4} fill="white" stroke="#9ca3af" strokeWidth={1.5} />
          {i > 0 && (
            <text x={xS(i)} y={yS(v) + 18} textAnchor="middle" fontSize={12} fill="#9ca3af">{v}%</text>
          )}
        </g>
      ))}

      {/* X axis */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="rgba(150,150,150,0.2)" strokeWidth={1} />

      {/* X labels */}
      {projection.labels.map((label, i) => (
        <text key={i} x={xS(i)} y={H - 10} textAnchor="middle" fontSize={13} fill="#6b7280">
          {label === "Today" ? "Today" : label.replace(" days", "d")}
        </text>
      ))}

      {/* Legend */}
      <g transform={`translate(${PAD.left}, 8)`}>
        <rect x={0} y={0} width={16} height={4} fill="#C8102E" rx={2} />
        <text x={20} y={5} fontSize={12} fill="#6b7280">With ad spend</text>
        <line x1={118} y1={2} x2={134} y2={2} stroke="#9ca3af" strokeWidth={2} strokeDasharray="4,2" />
        <text x={138} y={5} fontSize={12} fill="#6b7280">No spend</text>
      </g>
    </svg>
  );
}

// ─── Occupancy Intelligence Section ──────────────────────────────────────────

function OccupancyIntelligenceSection({
  property,
  units,
  leads,
  daysSinceRentRoll,
}: {
  property: Property;
  units: Unit[];
  leads: Lead[];
  daysSinceRentRoll: number | null;
}) {
  const [analysis, setAnalysis]     = useState<OccupancyAnalysis | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [customBudget, setCustomBudget] = useState<number | null>(null);

  const totalUnits    = property.total_units ?? units.length;
  const occupiedUnits = property.occupied_units ?? units.filter(u => u.status === "occupied").length;
  const vacantUnits   = units.filter(u => u.status === "vacant").length;
  const noticeUnits   = units.filter(u => u.status === "notice").length;
  const occPct        = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const recBudget    = recommendMonthlyBudget(occupiedUnits, totalUnits);
  const activeBudget = customBudget ?? recBudget;

  const activeLeads  = leads.filter(l => !["won","lost"].includes(l.status)).length;
  const tourLeads    = leads.filter(l => isTourOrBeyond(l.status)).length;
  const appliedLeads = leads.filter(l => isAppliedOrBeyond(l.status)).length;
  const wonLeads     = leads.filter(l => l.status === "won").length;

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${property.id}/occupancy-analysis`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property: {
            name:         property.name,
            address:      property.address,
            city:         property.city,
            state:        property.state,
            neighborhood: property.neighborhood,
          },
          occupancy: {
            total:         totalUnits,
            occupied:      occupiedUnits,
            vacant:        vacantUnits,
            notice:        noticeUnits,
            occupancy_pct: occPct,
          },
          pipeline: {
            active_leads:  activeLeads,
            tours:         tourLeads,
            applications:  appliedLeads,
            won:           wonLeads,
          },
          units: units.map(u => ({
            unit_type:    u.unit_type,
            status:       u.status,
            monthly_rent: u.monthly_rent,
            lease_end:    u.lease_end,
          })),
        }),
      });
      const json = await res.json();
      if (json.ok) setAnalysis(json.analysis);
      else setError(json.error ?? "Analysis failed");
    } catch {
      setError("Could not load analysis. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [property.id, totalUnits, occupiedUnits, vacantUnits, noticeUnits, occPct, activeLeads, tourLeads, appliedLeads, wonLeads, units, leads]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAnalysis(); }, [property.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const projection = computeBudgetProjection(units, activeBudget, totalUnits);

  const displayScore = analysis?.score ?? occPct;
  const displayLabel = analysis?.score_label ?? (occPct >= 90 ? "Excellent" : occPct >= 80 ? "Good" : occPct >= 70 ? "Fair" : occPct >= 60 ? "At Risk" : "Critical");
  const ss = scoreStyle(displayScore);

  const PRIORITY_STYLE = {
    high:   "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    medium: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    low:    "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Occupancy Intelligence</SectionLabel>
        <div className="flex items-center gap-3">
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-[#C8102E]" />
              AI is analyzing…
            </span>
          )}
          {!loading && (
            <div className="flex items-center gap-2">
              {daysSinceRentRoll !== null && daysSinceRentRoll >= 7 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠ Based on {daysSinceRentRoll}d-old rent roll
                </span>
              )}
              <button onClick={fetchAnalysis}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors dark:border-white/10 dark:text-gray-300">
                Refresh analysis
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top row: score + chart */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Score card */}
        <div className={cn("rounded-2xl border bg-white p-6 shadow-sm dark:bg-[#1C1F2E] dark:border-white/5 flex flex-col items-center justify-center text-center ring-2", ss.ring)}>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Occupancy Score</p>

          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-20 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-white/10" />
              <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-white/10" />
            </div>
          ) : (
            <>
              {/* Score circle */}
              <div className="relative mb-3">
                <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(150,150,150,0.15)" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={`${(displayScore / 100) * 264} 264`}
                    strokeLinecap="round"
                    className={ss.text}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                  <span className={cn("text-3xl font-black leading-none", ss.text)}>{displayScore}</span>
                  <span className="text-[10px] font-semibold text-gray-400">/100</span>
                </div>
              </div>

              <span className={cn("rounded-full px-3 py-1 text-xs font-bold", ss.bg, ss.text)}>
                {displayLabel}
              </span>
            </>
          )}

          {/* Occupancy bar */}
          <div className="mt-5 w-full">
            <div className="mb-1.5 flex justify-between text-[10px] text-gray-400">
              <span>Current occupancy</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">{occPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              <div className={cn("h-full rounded-full transition-all", ss.bar)} style={{ width: `${occPct}%` }} />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-gray-400">{occupiedUnits}/{totalUnits} units</span>
              <span className="font-semibold text-amber-500">Target: 95%</span>
            </div>
          </div>

          {/* Quick stats */}
          {(vacantUnits > 0 || noticeUnits > 0) && (
            <div className="mt-4 grid w-full grid-cols-2 gap-2">
              {vacantUnits > 0 && (
                <div className="rounded-xl bg-amber-50 p-2.5 text-center dark:bg-amber-900/10">
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{vacantUnits}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500">Vacant</p>
                </div>
              )}
              {noticeUnits > 0 && (
                <div className="rounded-xl bg-orange-50 p-2.5 text-center dark:bg-orange-900/10">
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{noticeUnits}</p>
                  <p className="text-[10px] text-orange-500 dark:text-orange-400">On notice</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Projection chart */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">90-Day Ad Spend Forecast</p>
              <p className="mt-0.5 text-xs text-gray-400">Conservative estimate — adjust monthly budget to see impact</p>
            </div>
            {/* Recommended badge */}
            {!loading && (
              <span className="shrink-0 rounded-full bg-[#C8102E]/10 px-2.5 py-1 text-[10px] font-bold text-[#C8102E]">
                LUB recommends ${recBudget.toLocaleString()}/mo
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex h-52 flex-col items-center justify-center gap-3">
              <div className="h-3 w-3 animate-spin rounded-full border border-gray-200 border-t-[#C8102E]" />
              <p className="text-xs text-gray-400">AI is scoring your occupancy…</p>
            </div>
          ) : totalUnits > 0 ? (
            <>
              {/* Budget presets */}
              <div className="mb-3 space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Monthly ad budget:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: `$${Math.round(recBudget * 0.5 / 100) * 100}/mo`, value: Math.round(recBudget * 0.5 / 100) * 100, tag: "Conservative" },
                    { label: `$${recBudget}/mo`, value: recBudget, tag: "Recommended ★" },
                    { label: `$${recBudget * 2}/mo`, value: recBudget * 2, tag: "Aggressive" },
                  ].map(({ label, value, tag }) => (
                    <button
                      key={value}
                      onClick={() => setCustomBudget(value)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                        activeBudget === value
                          ? "border-[#C8102E] bg-[#C8102E] text-white"
                          : "border-gray-200 text-gray-600 hover:border-[#C8102E] hover:text-[#C8102E] dark:border-white/10 dark:text-gray-300"
                      )}
                    >
                      <span className="block">{label}</span>
                      <span className={cn("block text-[9px] mt-0.5", activeBudget === value ? "opacity-80" : "text-gray-400")}>{tag}</span>
                    </button>
                  ))}
                  {/* Custom input */}
                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/10 px-2.5 py-1.5">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      placeholder="Custom"
                      className="w-16 bg-transparent text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
                      onChange={e => { const v = parseInt(e.target.value); if (v > 0) setCustomBudget(v); }}
                    />
                    <span className="text-xs text-gray-400">/mo</span>
                  </div>
                </div>
              </div>

              {/* Plan summary pills */}
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 px-3 py-1 text-xs text-gray-600 dark:text-gray-300">
                  ~<strong>{projection.leadsPerMonth}</strong> leads/mo
                </span>
                <span className="rounded-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 px-3 py-1 text-xs text-gray-600 dark:text-gray-300">
                  ~<strong>{projection.leasesPerMonth}</strong> leases/mo
                </span>
                <span className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  projection.daysTo95 <= 90
                    ? "bg-green-50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                    : "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
                )}>
                  {projection.daysTo95 <= 0
                    ? "Already at 95% ✓"
                    : projection.daysTo95 <= 90
                    ? `Reach 95% in ~${projection.daysTo95} days`
                    : `95% in ~${Math.round(projection.daysTo95 / 30)} months — increase budget`}
                </span>
              </div>

              {/* Mobile: full graph, optimised for phone width */}
              <div className="block lg:hidden mt-2">
                <OccupancyChartMobile projection={projection} />
              </div>

              {/* Desktop: full SVG chart */}
              <div className="hidden lg:block">
                <OccupancyChart projection={projection} />
              </div>
            </>
          ) : (
            <div className="flex h-44 flex-col items-center justify-center gap-2 text-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth={1.5} className="h-10 w-10 opacity-40">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upload a rent roll to see forecast</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis rows */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {[1,2].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
          ))}
          <div className="lg:col-span-2 h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
        </div>
      )}

      {!loading && !error && analysis && (
        <div className="mt-4 space-y-4">

          {/* Diagnosis + Market side by side */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Diagnosis */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">What&apos;s Wrong — Diagnosis</p>
              <ul className="space-y-2.5">
                {analysis.diagnosis.map((d, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      i === 0 ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "bg-gray-100 text-gray-500 dark:bg-white/10"
                    )}>{i + 1}</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            {/* Market Analysis */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Market Analysis — {property.city}, {property.state}</p>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{analysis.market_analysis}</p>
            </div>
          </div>

          {/* Action Plan */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Action Plan — How to Get Back to 90%+</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {analysis.suggestions.map((s, i) => (
                <div key={i} className="relative flex flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                  {/* Priority bar */}
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", s.priority === "high" ? "bg-red-400" : s.priority === "medium" ? "bg-amber-400" : "bg-blue-400")} />
                  <div className="ml-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", PRIORITY_STYLE[s.priority])}>
                        {s.priority}
                      </span>
                      <span className="text-[10px] text-gray-400">#{i + 1}</span>
                    </div>
                    <p className="mb-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{s.title}</p>
                    <p className="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{s.body}</p>
                    <div className="mt-auto rounded-lg bg-green-50 px-2.5 py-1.5 dark:bg-green-900/10">
                      <p className="text-[11px] font-semibold text-green-700 dark:text-green-400">↑ {s.impact}</p>
                    </div>
                    {(s.priority === "high" || s.priority === "medium") && (
                      <Link
                        href="/marketing"
                        className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-[#C8102E]/30 py-1.5 text-[11px] font-semibold text-[#C8102E] hover:bg-[#C8102E]/5 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        Run Ad Campaign →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Metric Cell ──────────────────────────────────────────────────────────────

function MetricCell({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Rent Roll Section ────────────────────────────────────────────────────────

function parseRentRollCsv(raw: string): Unit[] {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  const col = (row: string[], name: string) => {
    const idx = headers.findIndex(h => h.includes(name));
    return idx >= 0 ? (row[idx] ?? "").trim().replace(/"/g, "") : "";
  };
  return lines.slice(1).map(line => {
    const row = line.split(",");
    const unit_name = col(row, "unit");
    if (!unit_name) return null;
    const sr = col(row, "status").toLowerCase();
    const status = sr.includes("occup") ? "occupied" : sr.includes("notice") ? "notice" : sr.includes("unavail") ? "unavailable" : "vacant";
    const tr = col(row, "type").toLowerCase();
    const unit_type = tr.includes("studio") ? "studio" : tr.includes("4") ? "4br" : tr.includes("3") ? "3br" : tr.includes("2") ? "2br" : tr.includes("1") ? "1br" : tr || null;
    const bedsRaw = col(row, "bed");
    const sqftRaw = col(row, "sq") || col(row, "sqft") || col(row, "size");
    const rentRaw = col(row, "rent") || col(row, "price") || col(row, "amount");
    return {
      unit_name, unit_type,
      bedrooms: bedsRaw ? parseInt(bedsRaw, 10) || null : null,
      sq_ft: sqftRaw ? parseInt(sqftRaw.replace(/\D/g, ""), 10) || null : null,
      status,
      current_resident: col(row, "resident") || col(row, "tenant") || col(row, "name"),
      lease_end: col(row, "lease end") || col(row, "end date") || col(row, "move out"),
      monthly_rent: rentRaw ? parseInt(rentRaw.replace(/[^0-9]/g, ""), 10) || null : null,
    } as Unit;
  }).filter(Boolean) as Unit[];
}

function RentRollSection({ propertyId, daysSinceUpdate }: { propertyId: string; daysSinceUpdate: number | null }) {
  const [units, setUnits]           = useState<Unit[]>([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [parsing, setParsing]       = useState(false);
  const [preview, setPreview]       = useState<Unit[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [addError, setAddError]     = useState("");
  const [uploadMsg, setUploadMsg]   = useState("");

  const [newUnit, setNewUnit] = useState<Unit>({
    unit_name: "", unit_type: "", bedrooms: null, sq_ft: null,
    status: "vacant", current_resident: "", lease_end: "", monthly_rent: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/properties/${propertyId}/units`);
    if (res.ok) { const json = await res.json(); setUnits(json.units ?? []); }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    if (!isPdf && !isCsv) { setUploadMsg("Only PDF or CSV files are supported."); return; }
    if (isCsv) { setPreview(parseRentRollCsv(await file.text())); setUploadMsg(""); return; }
    setParsing(true); setUploadMsg("Reading PDF with AI… 10–20 seconds."); setPreview([]);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(`/api/properties/${propertyId}/parse-rent-roll`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) { setPreview(data.units); setUploadMsg(`AI extracted ${data.units.length} units. Review and save.`); }
      else setUploadMsg(data.error ?? "Failed to read PDF.");
    } catch { setUploadMsg("Network error. Try again."); }
    finally { setParsing(false); }
  }

  async function submitUnits() {
    if (preview.length === 0) return;
    setUploading(true);
    const res = await fetch(`/api/properties/${propertyId}/units`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ units: preview }),
    });
    if (res.ok) { setUploadMsg(`${preview.length} units saved.`); setPreview([]); setShowUpload(false); await load(); }
    else { const j = await res.json(); setUploadMsg(j.error ?? "Upload failed"); }
    setUploading(false);
  }

  async function submitNewUnit() {
    if (!newUnit.unit_name.trim()) { setAddError("Unit name required"); return; }
    setAddError("");
    const res = await fetch(`/api/properties/${propertyId}/units`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ units: [newUnit] }),
    });
    if (res.ok) { setNewUnit({ unit_name: "", unit_type: "", bedrooms: null, sq_ft: null, status: "vacant", current_resident: "", lease_end: "", monthly_rent: null }); setShowAdd(false); await load(); }
    else { const j = await res.json(); setAddError(j.error ?? "Failed"); }
  }

  const occupied = units.filter(u => u.status === "occupied").length;
  const vacant   = units.filter(u => u.status === "vacant").length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SectionLabel>Rent Roll & Occupancy</SectionLabel>
          {daysSinceUpdate !== null && (
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              daysSinceUpdate >= 14 ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
              : daysSinceUpdate >= 7  ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
              : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
            )}>
              {daysSinceUpdate === 0 ? "Updated today" : `Updated ${daysSinceUpdate}d ago`}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowAdd(a => !a); setShowUpload(false); }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">
            + Add Unit
          </button>
          <button onClick={() => { setShowUpload(u => !u); setShowAdd(false); }}
            className="rounded-lg bg-[#C8102E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A50D25]">
            Upload Rent Roll
          </button>
        </div>
      </div>

      {units.length > 0 && (
        <div className="mb-4 flex gap-4">
          {[
            { label: "Total Units", value: units.length },
            { label: "Occupied",    value: occupied, color: "text-green-600" },
            { label: "Vacant",      value: vacant,   color: "text-amber-600" },
            { label: "Occupancy",   value: `${Math.round((occupied / units.length) * 100)}%`, color: occupied / units.length >= 0.9 ? "text-green-600" : "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="text-[10px] font-medium text-gray-400">{s.label}</p>
              <p className={cn("mt-0.5 text-lg font-bold text-gray-900 dark:text-gray-100", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <p className="mb-3 text-sm font-semibold">Add a Unit</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Unit Name *", key: "unit_name", type: "text", placeholder: "101A" },
              { label: "Resident",    key: "current_resident", type: "text", placeholder: "Full name" },
              { label: "Rent ($)",    key: "monthly_rent", type: "number", placeholder: "1200" },
            ].map(f => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={(newUnit as unknown as Record<string, unknown>)[f.key] as string ?? ""}
                  onChange={e => setNewUnit(p => ({ ...p, [f.key]: f.type === "number" ? (e.target.value ? parseInt(e.target.value) : null) : e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100" />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
              <select value={newUnit.unit_type ?? ""} onChange={e => setNewUnit(p => ({ ...p, unit_type: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1C1F2E] dark:text-gray-300">
                <option value="">—</option>
                {["studio","1br","2br","3br","4br"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
              <select value={newUnit.status} onChange={e => setNewUnit(p => ({ ...p, status: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1C1F2E] dark:text-gray-300">
                {["vacant","occupied","notice","unavailable"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Lease End</label>
              <input type="date" value={newUnit.lease_end} onChange={e => setNewUnit(p => ({ ...p, lease_end: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100" />
            </div>
          </div>
          {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={submitNewUnit} className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A50D25]">Save Unit</button>
            <button onClick={() => setShowAdd(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {showUpload && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <p className="mb-1 text-sm font-semibold">Upload Rent Roll</p>
          <p className="mb-4 text-xs text-gray-500">PDF or CSV — works with Yardi, AppFolio, RealPage, Entrata, MRI</p>
          <label className={cn("mb-3 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            parsing ? "border-[#C8102E]/40 bg-[#C8102E]/5" : "border-gray-200 hover:border-[#C8102E]/40 dark:border-white/10")}>
            <input type="file" accept=".pdf,.csv" className="hidden" onChange={handleFileUpload} disabled={parsing} />
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C8102E]/30 border-t-[#C8102E]" />
                <p className="text-sm font-semibold text-[#C8102E]">AI is reading your rent roll…</p>
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-[#C8102E]/10">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth={1.5} className="h-6 w-6">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Click to upload PDF or CSV</p>
                <div className="flex gap-2">
                  <span className="rounded-full bg-[#C8102E]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#C8102E]">PDF — AI reads it</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-white/10">CSV — instant</span>
                </div>
              </>
            )}
          </label>

          {preview.length > 0 && (
            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
              <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-200">{preview.length} units extracted — review before saving</p>
              <div className="max-h-44 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-gray-400">
                    <th className="pb-1.5 pr-3">Unit</th><th className="pb-1.5 pr-3">Status</th>
                    <th className="pb-1.5 pr-3">Type</th><th className="pb-1.5 pr-3">Resident</th><th className="pb-1.5">Rent</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {preview.map((u, i) => (
                      <tr key={i}>
                        <td className="py-1 pr-3 font-medium text-gray-900 dark:text-gray-100">{u.unit_name}</td>
                        <td className="py-1 pr-3"><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize", STATUS_COLORS[u.status] ?? "bg-gray-100 text-gray-600")}>{u.status}</span></td>
                        <td className="py-1 pr-3 text-gray-500">{u.unit_type || "—"}</td>
                        <td className="py-1 pr-3 text-gray-500">{u.current_resident || "—"}</td>
                        <td className="py-1 text-gray-500">{u.monthly_rent ? `$${u.monthly_rent.toLocaleString()}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {uploadMsg && (
            <p className={cn("mt-2 text-xs font-medium", uploadMsg.includes("saved") || uploadMsg.includes("extracted") ? "text-green-600" : uploadMsg.includes("AI is") ? "text-[#C8102E]" : "text-red-600")}>{uploadMsg}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button onClick={submitUnits} disabled={uploading || preview.length === 0}
              className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A50D25] disabled:opacity-50">
              {uploading ? "Saving…" : `Save ${preview.length || ""} Units`}
            </button>
            <button onClick={() => { setShowUpload(false); setPreview([]); setUploadMsg(""); }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      <Card padding="none">
        {loading ? (
          <div className="p-5 text-sm text-gray-400">Loading units…</div>
        ) : units.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No units on file yet.</p>
            <p className="text-xs text-gray-400">Upload a rent roll or add units manually.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 dark:border-white/5 text-left">
              {["Unit","Status","Type","Resident","Rent","Lease End"].map(h => (
                <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {units.map((u, i) => (
                <tr key={u.id ?? i} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{u.unit_name}</td>
                  <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", STATUS_COLORS[u.status] ?? "bg-gray-100 text-gray-600")}>{u.status}</span></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.unit_type ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{u.current_resident || "—"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{u.monthly_rent ? `$${u.monthly_rent.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.lease_end || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ─── Market Position Section ──────────────────────────────────────────────────

interface MarketBenchmark {
  unit_type: string;
  market_avg_rent: number;
  market_low: number;
  market_high: number;
  property_rent: number | null;
  vs_market_pct: number;
  recommendation: string;
}

interface MarketPosition {
  market_summary: string;
  benchmarks: MarketBenchmark[];
  pricing_strategy: string;
  demand_outlook: string;
}

function MarketPositionSection({ property, units }: { property: Property; units: Unit[] }) {
  const [data, setData]     = useState<MarketPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [ran, setRan]       = useState(false);

  const unitRents = React.useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const u of units) {
      const t = u.unit_type ?? "unknown";
      if (!map[t]) map[t] = { count: 0, total: 0 };
      map[t].count++;
      if (u.monthly_rent) map[t].total += u.monthly_rent;
    }
    return Object.entries(map).map(([unit_type, v]) => ({
      unit_type,
      count: v.count,
      avg_rent: v.count > 0 && v.total > 0 ? Math.round(v.total / v.count) : null,
    }));
  }, [units]);

  async function run() {
    setLoading(true); setError(null); setRan(true);
    try {
      const res = await fetch("/api/properties/market-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_name: property.name,
          city: property.city,
          state: property.state,
          neighborhood: property.neighborhood,
          unit_rents: unitRents,
        }),
      });
      const json = await res.json();
      if (json.ok) setData(json);
      else setError(json.error ?? "Analysis failed");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Market Position & Rent Benchmarking</SectionLabel>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-[#C8102E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A50D25] disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
              Analyzing…
            </>
          ) : ran ? "Re-run Analysis" : "Run Market Analysis"}
        </button>
      </div>

      {!ran && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12 text-center dark:border-white/10">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C8102E]/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth={1.5} className="h-6 w-6">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">See how your rents compare to the market</p>
          <p className="mt-1 text-xs text-gray-400">AI will benchmark each unit type against {property.city}, {property.state} market averages</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {/* Summary + Outlook */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Market Summary — {property.city}, {property.state}</p>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{data.market_summary}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Demand Outlook</p>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{data.demand_outlook}</p>
              <div className="mt-4 rounded-xl bg-[#C8102E]/5 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8102E] mb-1">Pricing Strategy</p>
                <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">{data.pricing_strategy}</p>
              </div>
            </div>
          </div>

          {/* Benchmarks table */}
          <Card padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  {["Unit Type","Your Rent","Market Avg","Market Range","vs Market","Recommendation"].map(h => (
                    <th key={h} className={cn("px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400", h === "Unit Type" || h === "Recommendation" ? "text-left" : "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {data.benchmarks.map((b, i) => {
                  const above = b.vs_market_pct > 3;
                  const below = b.vs_market_pct < -3;
                  const atMkt = !above && !below;
                  return (
                    <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-white/3">
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100 capitalize">{b.unit_type}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900 dark:text-gray-100">
                        {b.property_rent ? `$${b.property_rent.toLocaleString()}` : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-700 dark:text-gray-300">${b.market_avg_rent.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-xs text-gray-500 dark:text-gray-400">
                        ${b.market_low.toLocaleString()} – ${b.market_high.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {b.property_rent ? (
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold",
                            above ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : below ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                            : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                          )}>
                            {above ? "+" : ""}{b.vs_market_pct.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-400 text-xs">no data</span>}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600 dark:text-gray-400 max-w-[200px]">{b.recommendation}</td>
                    </tr>
                  );
                  void atMkt;
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Competitor Monitoring Section ───────────────────────────────────────────

interface Competitor {
  name: string;
  distance: string;
  unit_types: string[];
  est_rent_range: string;
  occupancy_estimate: string;
  key_amenities: string[];
  threat_level: "high" | "medium" | "low";
  threat_reason: string;
}

interface CompetitorData {
  competitors: Competitor[];
  market_pressure: string;
  competitive_summary: string;
  your_advantages: string[];
  vulnerabilities: string[];
  recommended_counters: string[];
}

function CompetitorSection({ property, units }: { property: Property; units: Unit[] }) {
  const [data, setData]       = useState<CompetitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [ran, setRan]         = useState(false);

  const unitTypes = React.useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const u of units) {
      const t = u.unit_type ?? "unknown";
      if (!map[t]) map[t] = [];
      if (u.monthly_rent) map[t].push(u.monthly_rent);
    }
    const avgRents: Record<string, number> = {};
    for (const [t, rents] of Object.entries(map)) {
      if (rents.length > 0) avgRents[t] = Math.round(rents.reduce((s, r) => s + r, 0) / rents.length);
    }
    return { unitTypes: Object.keys(map), avgRents };
  }, [units]);

  async function run() {
    setLoading(true); setError(null); setRan(true);
    try {
      const res = await fetch("/api/properties/market-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_name: property.name,
          city:          property.city,
          state:         property.state,
          neighborhood:  property.neighborhood,
          unit_types:    unitTypes.unitTypes,
          avg_rents:     unitTypes.avgRents,
        }),
      });
      const json = await res.json();
      if (json.ok) setData(json);
      else setError(json.error ?? "Analysis failed");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const PRESSURE_STYLE: Record<string, string> = {
    low:      "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    moderate: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    high:     "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
    intense:  "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  const THREAT_STYLE = {
    high:   "border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10",
    medium: "border-amber-200 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10",
    low:    "border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E]",
  };

  const THREAT_BADGE = {
    high:   "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    low:    "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400",
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Competitor Intelligence</SectionLabel>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <><span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white dark:border-gray-400 dark:border-t-gray-900" /> Scanning market…</>
          ) : ran ? "Refresh Intelligence" : "Scan Competitors"}
        </button>
      </div>

      {!ran && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12 text-center dark:border-white/10">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900/10 dark:bg-white/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-gray-700 dark:text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Know your competition before they take your leads</p>
          <p className="mt-1 text-xs text-gray-400">AI identifies nearby competitors, their pricing, and how to beat them</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {/* Summary row */}
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Market Pressure</p>
              <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${PRESSURE_STYLE[data.market_pressure] ?? PRESSURE_STYLE.moderate}`}>
                {data.market_pressure}
              </span>
              <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{data.competitive_summary}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Your Advantages</p>
              <ul className="space-y-1.5">
                {data.your_advantages.map((a, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <span className="mt-0.5 text-green-500 shrink-0">✓</span>{a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Counter Moves</p>
              <ul className="space-y-1.5">
                {data.recommended_counters.map((c, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#C8102E] text-[9px] font-bold text-white">{i + 1}</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Vulnerabilities */}
          {data.vulnerabilities.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-900/10">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Watch Your Blind Spots</p>
              <ul className="space-y-1">
                {data.vulnerabilities.map((v, i) => (
                  <li key={i} className="flex gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <span className="shrink-0">⚠</span>{v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Competitor cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.competitors.map((c, i) => (
              <div key={i} className={`flex flex-col gap-3 rounded-xl border p-4 shadow-sm ${THREAT_STYLE[c.threat_level]}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${THREAT_BADGE[c.threat_level]}`}>
                    {c.threat_level} threat
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">📍</span> {c.distance} away
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">💵</span> {c.est_rent_range}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">🏠</span> {c.occupancy_estimate}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.key_amenities.map((a) => (
                    <span key={a} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-white/10 dark:text-gray-400">{a}</span>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/5 pt-2">{c.threat_reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rent Roll Stale Banner ───────────────────────────────────────────────────

function RentRollStaleBanner({
  daysSince,
  onUploadClick,
}: {
  daysSince: number;
  onUploadClick: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const isCritical = daysSince >= 14;
  const isWarning  = daysSince >= 7;

  if (!isWarning) return null;

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 rounded-xl border px-4 py-3",
      isCritical
        ? "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10"
        : "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10"
    )}>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 20 20" fill="currentColor" className={cn("h-5 w-5 shrink-0", isCritical ? "text-red-500" : "text-amber-500")}>
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <div>
          <p className={cn("text-sm font-semibold", isCritical ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400")}>
            Rent roll is {daysSince} days old
          </p>
          <p className={cn("text-xs", isCritical ? "text-red-600 dark:text-red-500" : "text-amber-600 dark:text-amber-500")}>
            Your occupancy analysis, issues, and projections are based on this data.{" "}
            {isCritical
              ? "Upload now to keep your dashboard accurate."
              : "Upload an updated version weekly for accurate insights."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onUploadClick}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-colors",
            isCritical ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"
          )}
        >
          Upload Now
        </button>
        <button onClick={() => setDismissed(true)} className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertyDetailPage() {
  const params     = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [units, setUnits]       = useState<Unit[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [propRes, leadsRes, unitsRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}/details`),
        fetch(`/api/leads?propertyId=${propertyId}`),
        fetch(`/api/properties/${propertyId}/units`),
      ]);
      if (propRes.ok)  { const j = await propRes.json();  setProperty(j.property ?? null); }
      if (leadsRes.ok) { const j = await leadsRes.json(); setLeads(j.leads ?? []); }
      if (unitsRes.ok) { const j = await unitsRes.json(); setUnits(j.units ?? []); }
      setLoading(false);
    }
    load();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />)}
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Property not found</p>
        <Link href="/properties" className="mt-3 text-sm text-[#C8102E] hover:underline">← Back to Properties</Link>
      </div>
    );
  }

  // ── Rent roll staleness ──────────────────────────────────────────────────────

  const rentRollLastUpdated = units.length > 0
    ? Math.max(...units.map(u => u.updated_at ? new Date(u.updated_at).getTime() : 0))
    : null;
  const daysSinceRentRoll = rentRollLastUpdated
    ? Math.floor((Date.now() - rentRollLastUpdated) / 86_400_000)
    : null;

  function scrollToRentRoll() {
    document.getElementById("rent-roll-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Derived stats ────────────────────────────────────────────────────────────

  const activeLeads  = leads.filter(l => !["won","lost"].includes(l.status));
  const tourLeads    = leads.filter(l => isTourOrBeyond(l.status));
  const appliedLeads = leads.filter(l => isAppliedOrBeyond(l.status));
  const wonLeads     = leads.filter(l => l.status === "won");

  const totalUnits    = property.total_units ?? units.length;
  const occupiedUnits = property.occupied_units ?? units.filter(u => u.status === "occupied").length;
  const occPct        = totalUnits > 0 ? pct(occupiedUnits, totalUnits) : null;
  const availUnits    = totalUnits > 0 ? totalUnits - occupiedUnits : null;

  // Source aggregation
  const sourceMap: Record<string, { leads: number; tours: number; apps: number; move_ins: number }> = {};
  for (const l of leads) {
    const src = l.source || "Unknown";
    if (!sourceMap[src]) sourceMap[src] = { leads: 0, tours: 0, apps: 0, move_ins: 0 };
    sourceMap[src].leads++;
    if (isTourOrBeyond(l.status))    sourceMap[src].tours++;
    if (isAppliedOrBeyond(l.status)) sourceMap[src].apps++;
    if (l.status === "won")          sourceMap[src].move_ins++;
  }
  const sources = Object.entries(sourceMap)
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.move_ins - a.move_ins || b.leads - a.leads);

  // Dynamic issues
  const issues: { type: "critical"|"warning"|"opportunity"; title: string; body: string; href?: string }[] = [];
  if (occPct !== null && occPct < 80) {
    issues.push({ type: "critical", title: `Low occupancy (${occPct}%)`, body: `Only ${occupiedUnits} of ${totalUnits} units occupied. Focus leasing on converting current pipeline leads.`, href: `/leads?propertyId=${propertyId}` });
  } else if (occPct !== null && occPct < 90) {
    issues.push({ type: "warning", title: `Occupancy below 90% (${occPct}%)`, body: `${availUnits} available units. Target is 95%+. Review pipeline for leads closest to converting.`, href: `/leads?propertyId=${propertyId}` });
  }
  const staleNew = leads.filter(l => l.status === "new" && Date.now() - new Date(l.created_at).getTime() > 86_400_000);
  if (staleNew.length > 0) {
    issues.push({ type: "critical", title: `${staleNew.length} new ${staleNew.length === 1 ? "lead" : "leads"} without reply`, body: `${staleNew.map(l => l.name).slice(0,3).join(", ")}${staleNew.length > 3 ? ` +${staleNew.length - 3} more` : ""} need a response. Speed of reply directly impacts tour rate.`, href: `/leads?propertyId=${propertyId}&status=new` });
  }
  const stale = leads.filter(l => ["contacted","engaged"].includes(l.status) && Date.now() - new Date(l.last_contacted_at ?? l.updated_at).getTime() > 3 * 86_400_000);
  if (stale.length > 0) {
    issues.push({ type: "warning", title: `${stale.length} leads silent 3+ days`, body: `${stale.map(l => l.name).slice(0,3).join(", ")}${stale.length > 3 ? ` +${stale.length - 3} more` : ""} haven't engaged recently. A follow-up now can recover them.`, href: `/leads?propertyId=${propertyId}` });
  }
  if (tourLeads.length > 0 && appliedLeads.length === 0) {
    issues.push({ type: "warning", title: "No applications from toured leads", body: `${tourLeads.length} leads toured but none applied. Send the application link immediately after each tour.`, href: `/leads?propertyId=${propertyId}` });
  }
  if (issues.length === 0 && wonLeads.length > 0) {
    issues.push({ type: "opportunity", title: `${wonLeads.length} move-in${wonLeads.length > 1 ? "s" : ""} this cycle`, body: "Strong conversion. Ask new residents for referrals — they convert at 3× the rate of cold leads at $0 cost." });
  }

  const recentLeads = [...leads].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8);
  const criticalCount = issues.filter(i => i.type === "critical").length;

  const ISSUE_STYLES = {
    critical:    { bar: "bg-red-500",   badge: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",     icon: "✕", label: "Critical" },
    warning:     { bar: "bg-amber-400", badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", icon: "⚠", label: "Warning" },
    opportunity: { bar: "bg-blue-400",  badge: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",   icon: "→", label: "Opportunity" },
  };

  return (
    <div className="space-y-8 p-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-400">
          <Link href="/properties" className="hover:text-gray-700 transition-colors dark:hover:text-gray-300">Properties</Link>
          <span>/</span>
          <span className="text-gray-600 dark:text-gray-300">{property.name}</span>
        </div>

        <div className="flex flex-wrap items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{property.name}</h1>
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">Active</span>
              {criticalCount > 0 && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {criticalCount} critical {criticalCount === 1 ? "issue" : "issues"}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">{property.address} · {property.city}, {property.state} {property.zip}</p>
            {property.active_special && <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">Special: {property.active_special}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {occPct !== null && (
              <div className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                <p className="text-[10px] font-medium text-gray-400">Occupancy</p>
                <p className={cn("mt-0.5 text-sm font-bold", occPct >= 90 ? "text-green-600" : occPct >= 78 ? "text-amber-600" : "text-red-500")}>{occPct}%</p>
              </div>
            )}
            {availUnits !== null && (
              <div className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                <p className="text-[10px] font-medium text-gray-400">Available</p>
                <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">{availUnits} units</p>
              </div>
            )}
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="text-[10px] font-medium text-gray-400">Active Leads</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">{activeLeads.length}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="text-[10px] font-medium text-gray-400">AI Number</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-gray-900 dark:text-gray-100">{property.phone_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/leads?propertyId=${propertyId}`}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
              View Leads
            </Link>
            <Link href={`/properties/${propertyId}/edit`}
              className="rounded-lg bg-[#C8102E] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#A50D25]">
              Edit Property
            </Link>
          </div>
        </div>
      </div>

      {/* ── Rent Roll Stale Banner ──────────────────────────────────────── */}
      {daysSinceRentRoll !== null && (
        <RentRollStaleBanner daysSince={daysSinceRentRoll} onUploadClick={scrollToRentRoll} />
      )}

      {/* ── Occupancy Intelligence ──────────────────────────────────────── */}
      <OccupancyIntelligenceSection property={property} units={units} leads={leads} daysSinceRentRoll={daysSinceRentRoll} />

      {/* ── Pipeline KPIs ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Pipeline Overview</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCell label="Active Leads"    value={activeLeads.length}   sub="in pipeline" />
          <MetricCell label="Tours Scheduled" value={tourLeads.length}     sub={`${pct(tourLeads.length, activeLeads.length || 1)}% tour rate`} />
          <MetricCell label="Applications"    value={appliedLeads.length}  sub={`${pct(appliedLeads.length, tourLeads.length || 1)}% of toured`} />
          <MetricCell label="Move-ins"        value={wonLeads.length}      sub={`${pct(wonLeads.length, activeLeads.length || 1)}% close rate`} />
        </div>
      </div>

      {/* ── Conversion Funnel ───────────────────────────────────────────── */}
      {activeLeads.length > 0 && (
        <div>
          <SectionLabel>Conversion Funnel</SectionLabel>
          <Card padding="none">
            <div className="flex divide-x divide-gray-50 dark:divide-white/5">
              {[
                { label: "Leads",        value: activeLeads.length },
                { label: "Tours",        value: tourLeads.length },
                { label: "Applications", value: appliedLeads.length },
                { label: "Move-ins",     value: wonLeads.length },
              ].map((stage, i, arr) => {
                const widthPct = pct(stage.value, arr[0].value || 1);
                const convPct  = i === 0 ? 100 : pct(stage.value, arr[i - 1].value || 1);
                const isWeak   = i > 0 && convPct < 40 && arr[i-1].value > 0;
                return (
                  <div key={stage.label} className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 dark:bg-white/10">{i + 1}</span>
                      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{stage.label}</p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div className={cn("h-full rounded-full", isWeak ? "bg-red-400" : "bg-[#C8102E]")} style={{ width: `${widthPct}%` }} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stage.value}</p>
                    {i > 0 && arr[i-1].value > 0 && (
                      <div className={cn("mt-auto rounded-lg px-2 py-1 text-center text-[10px] font-semibold", isWeak ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400")}>
                        {convPct}% from prev
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Lead Source Performance ─────────────────────────────────────── */}
      {sources.length > 0 && (
        <div>
          <SectionLabel>Lead Source Performance</SectionLabel>
          <Card padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  {["Source","Leads","Tours","Tour Rate","Apps","Move-ins","Conv. Rate"].map(h => (
                    <th key={h} className={cn("px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400", h === "Source" ? "text-left" : "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {sources.map(src => {
                  const tourRate = pct(src.tours, src.leads);
                  const convRate = pct(src.move_ins, src.leads);
                  const isTop    = src.move_ins === Math.max(...sources.map(s => s.move_ins)) && src.move_ins > 0;
                  const isDead   = src.move_ins === 0 && src.leads >= 5;
                  return (
                    <tr key={src.name} className="hover:bg-gray-50/60 dark:hover:bg-white/3">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{src.name}</span>
                          {isTop && <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">Top</span>}
                          {isDead && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">0 move-ins</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-700 dark:text-gray-300">{src.leads}</td>
                      <td className="px-5 py-3.5 text-right text-gray-700 dark:text-gray-300">{src.tours}</td>
                      <td className={cn("px-5 py-3.5 text-right font-medium", tourRate >= 35 ? "text-green-600" : tourRate < 20 && src.leads >= 3 ? "text-red-500" : "text-gray-700 dark:text-gray-300")}>{tourRate}%</td>
                      <td className="px-5 py-3.5 text-right text-gray-700 dark:text-gray-300">{src.apps}</td>
                      <td className="px-5 py-3.5 text-right"><span className={cn("font-semibold", src.move_ins > 0 ? "text-gray-900 dark:text-gray-100" : "text-gray-400")}>{src.move_ins}</span></td>
                      <td className={cn("px-5 py-3.5 text-right font-semibold", convRate >= 8 ? "text-green-600" : convRate === 0 && src.leads >= 5 ? "text-red-500" : "text-gray-700 dark:text-gray-300")}>{convRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── Issues & Opportunities ──────────────────────────────────────── */}
      {issues.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>Issues & Opportunities</SectionLabel>
            <span className="text-xs text-gray-400">{criticalCount > 0 && `${criticalCount} critical · `}{issues.filter(i => i.type === "warning").length > 0 && `${issues.filter(i => i.type === "warning").length} warnings · `}{issues.filter(i => i.type === "opportunity").length} opportunities</span>
          </div>
          <div className="space-y-3">
            {issues.map((issue, i) => {
              const s = ISSUE_STYLES[issue.type];
              return (
                <div key={i} className="relative flex gap-4 overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                  <div className={cn("absolute bottom-0 left-0 top-0 w-1", s.bar)} />
                  <div className="ml-3 flex-1">
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", s.badge)}>{s.icon} {s.label}</span>
                    <h3 className="mt-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{issue.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{issue.body}</p>
                    {issue.href && <Link href={issue.href} className="mt-3 inline-block text-xs font-medium text-[#C8102E] hover:underline">View leads →</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Market Position ─────────────────────────────────────────────── */}
      <MarketPositionSection property={property} units={units} />

      {/* ── Competitor Intelligence ─────────────────────────────────────── */}
      <CompetitorSection property={property} units={units} />

      {/* ── Rent Roll & Occupancy ───────────────────────────────────────── */}
      <div id="rent-roll-section">
        <RentRollSection propertyId={propertyId} daysSinceUpdate={daysSinceRentRoll} />
      </div>

      {/* ── Recent Lead Activity ────────────────────────────────────────── */}
      {recentLeads.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>Recent Lead Activity</SectionLabel>
            <Link href={`/leads?propertyId=${propertyId}`} className="text-xs font-medium text-[#C8102E] hover:underline">View all leads →</Link>
          </div>
          <Card padding="none">
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-white/3 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{lead.name}</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-400 capitalize">
                        {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
                      </span>
                      {lead.source && <span className="text-[11px] text-gray-400">{lead.source}</span>}
                    </div>
                    {lead.ai_score != null && <p className="mt-0.5 text-xs text-gray-500">AI score: {lead.ai_score}/10</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(lead.updated_at)}</span>
                  <Link href={`/leads?lead=${lead.id}`} className="shrink-0 text-[11px] font-medium text-gray-400 transition-colors hover:text-[#C8102E]">Open →</Link>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
