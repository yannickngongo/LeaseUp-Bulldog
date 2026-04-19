"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TourStatus = "confirmed" | "pending" | "completed" | "no_show" | "cancelled";

interface Tour {
  id: string;
  lead: string;
  property: string;
  date: string;       // "Apr 20"
  day: number;        // 0–6 index into WEEK_DATES
  time: string;
  time_sort: number;  // 0–23 for ordering
  staff?: string;
  status: TourStatus;
  notes?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const WEEK_DATES = ["Apr 20", "Apr 21", "Apr 22", "Apr 23", "Apr 24", "Apr 25", "Apr 26"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TODAY_IDX  = 0; // Apr 20 = today

const TOURS: Tour[] = [
  { id: "t1",  lead: "Carlos Reyes",    property: "Parkview Commons", date: "Apr 20", day: 0, time: "10:00 AM", time_sort: 10, staff: "Marcus T.",  status: "confirmed" },
  { id: "t2",  lead: "Maya Thompson",   property: "The Monroe",       date: "Apr 20", day: 0, time: "2:00 PM",  time_sort: 14, staff: "Marcus T.",  status: "completed" },
  { id: "t3",  lead: "Sofia Ruiz",      property: "The Monroe",       date: "Apr 20", day: 0, time: "4:00 PM",  time_sort: 16, staff: "Dana K.",    status: "no_show" },
  { id: "t4",  lead: "Jordan Ellis",    property: "The Monroe",       date: "Apr 21", day: 1, time: "11:00 AM", time_sort: 11, staff: "Marcus T.",  status: "confirmed" },
  { id: "t5",  lead: "Priya Sharma",    property: "Parkview Commons", date: "Apr 22", day: 2, time: "4:00 PM",  time_sort: 16, staff: "Dana K.",    status: "pending" },
  { id: "t6",  lead: "Aisha Patel",     property: "Sonoran Ridge",    date: "Apr 22", day: 2, time: "10:30 AM", time_sort: 10, staff: "Ray M.",     status: "confirmed" },
  { id: "t7",  lead: "Liam Chen",       property: "The Monroe",       date: "Apr 23", day: 3, time: "1:00 PM",  time_sort: 13, staff: "Marcus T.",  status: "pending" },
  { id: "t8",  lead: "Derek Nguyen",    property: "Sonoran Ridge",    date: "Apr 24", day: 4, time: "3:00 PM",  time_sort: 15, staff: "Ray M.",     status: "confirmed" },
  { id: "t9",  lead: "Keisha Monroe",   property: "Parkview Commons", date: "Apr 25", day: 5, time: "11:00 AM", time_sort: 11, staff: "Dana K.",    status: "confirmed" },
  { id: "t10", lead: "Tyler Rhodes",    property: "Vista on 5th",     date: "Apr 25", day: 5, time: "2:00 PM",  time_sort: 14, staff: "Marcus T.",  status: "pending" },
  { id: "t11", lead: "Nadia Okafor",    property: "The Monroe",       date: "Apr 26", day: 6, time: "10:00 AM", time_sort: 10, staff: "Marcus T.",  status: "confirmed" },
];

const STATUS_CONFIG: Record<TourStatus, { bg: string; border: string; text: string; dot: string; label: string }> = {
  confirmed:  { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  dot: "bg-green-500",  label: "Confirmed" },
  pending:    { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  dot: "bg-amber-400",  label: "Pending" },
  completed:  { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-500",   label: "Completed" },
  no_show:    { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-600",    dot: "bg-red-500",    label: "No-show" },
  cancelled:  { bg: "bg-gray-50",   border: "border-gray-200",   text: "text-gray-500",   dot: "bg-gray-400",   label: "Cancelled" },
};

const PROPERTIES = ["All Properties", "The Monroe", "Parkview Commons", "Sonoran Ridge", "Vista on 5th"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [propertyFilter, setPropertyFilter] = useState("All Properties");
  const [statusFilter, setStatusFilter]     = useState<TourStatus | "all">("all");

  const filtered = TOURS.filter((t) => {
    if (propertyFilter !== "All Properties" && t.property !== propertyFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  const todayTours       = TOURS.filter((t) => t.day === TODAY_IDX);
  const confirmNeeded    = TOURS.filter((t) => t.status === "pending").length;
  const completedCount   = TOURS.filter((t) => t.status === "completed").length;
  const noShowCount      = TOURS.filter((t) => t.status === "no_show").length;
  const totalWithOutcome = completedCount + noShowCount;
  const noShowRate       = totalWithOutcome === 0 ? 0 : Math.round((noShowCount / totalWithOutcome) * 100);

  const STATUS_FILTERS: { key: TourStatus | "all"; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "confirmed", label: "Confirmed" },
    { key: "pending",   label: "Pending" },
    { key: "completed", label: "Completed" },
    { key: "no_show",   label: "No-show" },
  ];

  return (
    <div className="space-y-6 p-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Tour Calendar</h1>
          <p className="mt-0.5 text-sm text-gray-500">Week of April 20 – 26, 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50">
            ← Prev
          </button>
          <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Today
          </button>
          <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50">
            Next →
          </button>
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-gray-400 focus:outline-none"
        >
          {PROPERTIES.map((p) => <option key={p}>{p}</option>)}
        </select>

        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                statusFilter === f.key
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_288px]">

        {/* ── Week grid ────────────────────────────────────────────────── */}
        <Card padding="none">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_LABELS.map((day, i) => {
              const isToday = i === TODAY_IDX;
              const count = filtered.filter((t) => t.day === i).length;
              return (
                <div key={day} className={cn("py-3 text-center", isToday && "bg-red-50/60")}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{day}</p>
                  <p className={cn("mt-0.5 text-sm font-semibold", isToday ? "text-[#C8102E]" : "text-gray-700")}>
                    {WEEK_DATES[i].split(" ")[1]}
                  </p>
                  {count > 0 && (
                    <span className={cn(
                      "mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                      isToday ? "bg-[#C8102E] text-white" : "bg-gray-100 text-gray-600"
                    )}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tour slots */}
          <div className="grid min-h-[400px] grid-cols-7 divide-x divide-gray-50">
            {DAY_LABELS.map((_, colIdx) => {
              const dayTours = filtered
                .filter((t) => t.day === colIdx)
                .sort((a, b) => a.time_sort - b.time_sort);
              const isToday = colIdx === TODAY_IDX;
              return (
                <div key={colIdx} className={cn("p-1.5", isToday && "bg-red-50/20")}>
                  {dayTours.length === 0 && (
                    <div className="mt-4 text-center text-[10px] text-gray-300">—</div>
                  )}
                  {dayTours.map((tour) => {
                    const s = STATUS_CONFIG[tour.status];
                    return (
                      <Link
                        key={tour.id}
                        href={`/leads/${tour.id}`}
                        className={cn(
                          "mb-1.5 block rounded-lg border p-2 text-[11px] leading-snug transition-opacity hover:opacity-80",
                          s.bg, s.border
                        )}
                      >
                        <p className={cn("font-semibold truncate", s.text)}>{tour.lead}</p>
                        <p className="mt-0.5 text-gray-500">{tour.time}</p>
                        <p className="mt-0.5 truncate text-gray-400">{tour.property}</p>
                        {tour.staff && (
                          <p className="mt-0.5 text-[10px] text-gray-400">{tour.staff}</p>
                        )}
                        <div className="mt-1 flex items-center gap-1">
                          <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                          <span className={cn("text-[10px] font-medium", s.text)}>{s.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Right panel ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Summary stats */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">This Week</h3>
            <div className="space-y-2.5">
              {[
                { label: "Total Tours",    value: TOURS.length,    color: "text-gray-900" },
                { label: "Confirmed",      value: TOURS.filter(t => t.status === "confirmed").length,  color: "text-green-600" },
                { label: "Pending",        value: confirmNeeded,   color: "text-amber-600" },
                { label: "Completed",      value: completedCount,  color: "text-blue-600" },
                { label: "No-shows",       value: noShowCount,     color: "text-red-500" },
                { label: "No-show Rate",   value: `${noShowRate}%`, color: noShowRate > 15 ? "text-red-500" : "text-gray-700" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <span className={cn("text-sm font-semibold", s.color)}>{s.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Needs confirmation */}
          {confirmNeeded > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Needs Confirmation
                <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  {confirmNeeded}
                </span>
              </h3>
              <div className="space-y-2.5">
                {TOURS.filter((t) => t.status === "pending").map((tour) => (
                  <div key={tour.id} className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
                    <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                      {tour.lead.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-900">{tour.lead}</p>
                      <p className="text-[11px] text-gray-500">{tour.date} · {tour.time}</p>
                      <p className="text-[11px] text-gray-400">{tour.property}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Today's tours */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Today — {WEEK_DATES[TODAY_IDX]}
            </h3>
            {todayTours.length === 0 ? (
              <p className="text-xs text-gray-400">No tours scheduled today.</p>
            ) : (
              <div className="space-y-2.5">
                {todayTours.sort((a, b) => a.time_sort - b.time_sort).map((tour) => {
                  const s = STATUS_CONFIG[tour.status];
                  return (
                    <div key={tour.id} className={cn("rounded-lg border p-3", s.bg, s.border)}>
                      <div className="flex items-start justify-between">
                        <p className={cn("text-xs font-semibold", s.text)}>{tour.lead}</p>
                        <span className={cn("text-[10px] font-medium capitalize", s.text)}>{s.label}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-600">{tour.time}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{tour.property}</p>
                      {tour.staff && (
                        <p className="mt-0.5 text-[11px] text-gray-400">With {tour.staff}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* No-show alert */}
          {noShowRate > 15 && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-semibold text-red-700">High no-show rate ({noShowRate}%)</p>
              <p className="mt-1 text-[11px] leading-relaxed text-red-600">
                Your no-show rate exceeds the 15% benchmark. Consider adding a same-day reminder automation.
              </p>
              <Link href="/automations" className="mt-2 inline-block text-[11px] font-medium text-red-700 hover:underline">
                Edit automations →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
