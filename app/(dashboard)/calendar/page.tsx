"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  property_id: string;
  unit_type?: string;
  move_in_date?: string;
  created_at: string;
}

interface TourLead extends Lead {
  propertyName: string;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 dark:bg-white/5 ${className ?? ""}`} />;
}

export default function CalendarPage() {
  const [tours, setTours]         = useState<TourLead[]>([]);
  const [loading, setLoading]     = useState(true);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [propertyFilter, setPropertyFilter] = useState("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { user } } = await getSupabase().auth.getUser();
        if (!user?.email) return;

        const propRes = await fetch(`/api/properties?email=${encodeURIComponent(user.email)}`);
        const propJson = await propRes.json();
        const props: { id: string; name: string }[] = propJson.properties ?? [];
        setProperties(props);

        const allTours: TourLead[] = [];
        await Promise.all(props.map(async (p) => {
          const res = await fetch(`/api/leads?propertyId=${p.id}`);
          const json = await res.json();
          const leads: Lead[] = json.leads ?? [];
          leads
            .filter(l => l.status === "tour_scheduled")
            .forEach(l => allTours.push({ ...l, propertyName: p.name }));
        }));

        allTours.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setTours(allTours);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = propertyFilter === "all"
    ? tours
    : tours.filter(t => t.property_id === propertyFilter);

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayIdx = today.getDay();

  return (
    <div className="space-y-4 p-4 lg:p-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tour Calendar</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Loading…" : `${tours.length} tour${tours.length !== 1 ? "s" : ""} scheduled`}
          </p>
        </div>
      </div>

      {/* Property filter */}
      {!loading && properties.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPropertyFilter("all")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              propertyFilter === "all"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
            )}
          >
            All Properties
          </button>
          {properties.map(p => (
            <button
              key={p.id}
              onClick={() => setPropertyFilter(p.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                propertyFilter === p.id
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/5 dark:bg-[#1C1F2E]">
            <div className="grid grid-cols-7 gap-2 mb-6">
              {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          </div>
        </div>
      )}

      {/* No properties */}
      {!loading && properties.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center dark:border-white/10">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#C8102E]/8">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth={1.5} className="h-8 w-8">
              <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">No properties set up</h3>
          <p className="mb-5 text-sm text-gray-400">Add a property first to start scheduling tours.</p>
          <a href="/setup"
            className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors">
            Set Up Property →
          </a>
        </div>
      )}

      {/* Has properties, no tours */}
      {!loading && properties.length > 0 && tours.length === 0 && (
        <div className="grid gap-5 xl:grid-cols-[1fr_288px]">
          {/* Week grid */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] dark:border-white/5 dark:bg-[#1C1F2E]">
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-white/5">
              {DAY_LABELS.map((day, i) => {
                const isToday = i === todayIdx;
                return (
                  <div key={day} className={cn("py-3 text-center", isToday && "bg-red-50/60 dark:bg-[#C8102E]/10")}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{day}</p>
                    <p className={cn("mt-0.5 text-sm font-semibold", isToday ? "text-[#C8102E]" : "text-gray-700 dark:text-gray-300")}>
                      {weekDays[i].getDate()}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-gray-300">
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No tours scheduled</p>
              <p className="mt-1 text-xs text-gray-400">Tours appear here when leads are moved to "Tour Scheduled" status.</p>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">This Week</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Total Tours", value: 0 },
                  { label: "Confirmed", value: 0 },
                  { label: "Pending", value: 0 },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Has tours */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-[1fr_288px]">
          {/* Week grid */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] dark:border-white/5 dark:bg-[#1C1F2E]">
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-white/5">
              {DAY_LABELS.map((day, i) => {
                const isToday = i === todayIdx;
                return (
                  <div key={day} className={cn("py-3 text-center", isToday && "bg-red-50/60 dark:bg-[#C8102E]/10")}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{day}</p>
                    <p className={cn("mt-0.5 text-sm font-semibold", isToday ? "text-[#C8102E]" : "text-gray-700 dark:text-gray-300")}>
                      {weekDays[i].getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Tour list under today */}
            <div className="p-5">
              <p className="mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Scheduled Tours ({filtered.length})
              </p>
              <div className="space-y-2">
                {filtered.map(tour => (
                  <div key={tour.id}
                    className="flex items-start gap-3 rounded-xl border border-green-100 bg-green-50 p-3 dark:border-green-900/30 dark:bg-green-900/10">
                    <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      {tour.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{tour.name}</p>
                      <p className="text-[11px] text-gray-500">{tour.propertyName}</p>
                      {tour.unit_type && <p className="text-[11px] text-gray-400">{tour.unit_type}</p>}
                      {tour.move_in_date && (
                        <p className="text-[11px] text-gray-400">Move-in: {new Date(tour.move_in_date).toLocaleDateString()}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      Scheduled
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Summary</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Total Tours", value: tours.length, color: "text-gray-900 dark:text-gray-100" },
                  { label: "Properties", value: properties.length, color: "text-gray-700 dark:text-gray-300" },
                  {
                    label: "Showing",
                    value: filtered.length,
                    color: "text-[#C8102E]",
                  },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className={cn("text-sm font-semibold", s.color)}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tour cards */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Scheduled Tours
                <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                  {filtered.length}
                </span>
              </h3>
              <div className="space-y-2.5">
                {filtered.map(tour => (
                  <div key={tour.id} className="flex items-start gap-2.5">
                    <div className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                      {tour.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{tour.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{tour.propertyName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
