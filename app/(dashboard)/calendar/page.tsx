"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getOperatorEmail, authFetch } from "@/lib/demo-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  status: string;
  property_name?: string;
  property_id: string;
  follow_up_at?: string | null;
  created_at: string;
  last_contacted_at?: string | null;
  source?: string;
}

interface Property {
  id: string;
  name: string;
}

interface TourEvent {
  leadId:       string;
  leadName:     string;
  propertyName: string;
  propertyId:   string;
  date:         Date;
  source?:      string;
  status:       string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date)  { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 dark:bg-white/5 ${className ?? ""}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [current, setCurrent]     = useState(new Date());
  const [selected, setSelected]   = useState<Date>(new Date());
  const [tours, setTours]         = useState<TourEvent[]>([]);
  const [followUps, setFollowUps] = useState<TourEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<"month" | "list">("month");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const email = await getOperatorEmail();
      if (!email) return;

      const [setupRes, propRes] = await Promise.all([
        authFetch(`/api/setup`),
        authFetch(`/api/properties`),
      ]);
      const setupJson = await setupRes.json();
      const propJson  = await propRes.json();
      const props: Property[] = propJson.properties ?? [];

      if (!setupJson.operator || props.length === 0) return;

      // Fetch tours from the tours table (actual scheduled_at date) per property
      const allTourRows: Array<{
        id: string; scheduled_at: string; status: string; notes?: string;
        lead_id: string; property_id: string;
        leads: { name: string; phone: string };
        properties: { name: string };
      }> = [];
      await Promise.all(props.map(async (p) => {
        const res  = await fetch(`/api/tours?propertyId=${p.id}`);
        const json = await res.json();
        allTourRows.push(...(json.tours ?? []));
      }));

      const tourEvents: TourEvent[] = allTourRows.map((t) => ({
        leadId:       t.lead_id,
        leadName:     t.leads?.name ?? "Unknown",
        propertyName: t.properties?.name ?? "Unknown Property",
        propertyId:   t.property_id,
        date:         new Date(t.scheduled_at),
        status:       "tour",
      }));

      // Follow-ups: leads with follow_up_at set in the future
      const allLeads: Lead[] = [];
      await Promise.all(props.map(async (p) => {
        const res  = await fetch(`/api/leads?propertyId=${p.id}`);
        const json = await res.json();
        const rows: Lead[] = json.leads ?? [];
        rows.forEach((l) => { l.property_name = p.name; });
        allLeads.push(...rows);
      }));

      const now = new Date();
      const fuEvents: TourEvent[] = allLeads
        .filter((l) => l.follow_up_at && new Date(l.follow_up_at) > now && l.status !== "tour_scheduled")
        .map((l) => ({
          leadId:       l.id,
          leadName:     l.name,
          propertyName: l.property_name ?? "Unknown Property",
          propertyId:   l.property_id,
          date:         new Date(l.follow_up_at!),
          source:       l.source,
          status:       "followup",
        }));

      setTours(tourEvents);
      setFollowUps(fuEvents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const allEvents = [...tours, ...followUps];

  // Events on the selected day
  const selectedEvents = allEvents.filter((e) => sameDay(e.date, selected));

  // Events count per date in current month
  function eventsOnDate(d: Date) { return allEvents.filter((e) => sameDay(e.date, d)); }

  // Calendar grid
  const monthStart    = startOfMonth(current);
  const startDayOfWeek = monthStart.getDay();
  const totalDays     = daysInMonth(current);
  const today         = new Date();

  function prevMonth() { setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1)); }
  function nextMonth() { setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1)); }
  function goToday()   { setCurrent(new Date()); setSelected(new Date()); }

  // List view: next 30 days of events sorted
  const now = new Date();
  const upcoming = allEvents
    .filter((e) => e.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 30);

  return (
    <div className="flex h-full flex-col space-y-0 p-4 lg:p-6 gap-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">
            Tours and follow-ups across all properties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-gray-100 bg-gray-50 p-1 dark:border-white/5 dark:bg-white/5">
            {(["month", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  view === v
                    ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={goToday}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 transition-colors">
            Today
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Tours Scheduled", value: tours.length,     color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "Follow-Ups Due",  value: followUps.length, color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "This Week",       value: allEvents.filter((e) => {
            const diff = e.date.getTime() - now.getTime();
            return diff >= 0 && diff <= 7 * 86400000;
          }).length, color: "text-[#C8102E]", bg: "bg-[#C8102E]/5" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-gray-100 p-4 shadow-sm dark:border-white/5 ${s.bg}`}>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {view === "month" ? (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_280px]">

          {/* Calendar grid */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
            {/* Nav */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/5">
              <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <p className="font-bold text-gray-900 dark:text-gray-100">{MONTHS[current.getMonth()]} {current.getFullYear()}</p>
              <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-50 dark:border-white/5">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{d}</div>
              ))}
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-7">
                {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="m-1 h-14" />)}
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {/* Empty cells for offset */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[64px] border-b border-r border-gray-50 dark:border-white/5" />
                ))}
                {/* Day cells */}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const dayNum  = i + 1;
                  const date    = new Date(current.getFullYear(), current.getMonth(), dayNum);
                  const isToday = sameDay(date, today);
                  const isSel   = sameDay(date, selected);
                  const events  = eventsOnDate(date);
                  const tourCnt = events.filter((e) => e.status === "tour").length;
                  const fuCnt   = events.filter((e) => e.status === "followup").length;
                  return (
                    <button
                      key={dayNum}
                      onClick={() => setSelected(date)}
                      className={`flex min-h-[64px] flex-col gap-1 border-b border-r border-gray-50 p-1.5 text-left transition-colors dark:border-white/5 ${
                        isSel   ? "bg-[#C8102E]/5 dark:bg-[#C8102E]/10"
                        : isToday ? "bg-gray-50 dark:bg-white/5"
                        : "hover:bg-gray-50/50 dark:hover:bg-white/3"
                      }`}
                    >
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday ? "bg-[#C8102E] text-white"
                        : isSel  ? "font-bold text-[#C8102E]"
                        : "text-gray-700 dark:text-gray-300"
                      }`}>{dayNum}</span>
                      {tourCnt > 0 && (
                        <span className="w-full truncate rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {tourCnt} tour{tourCnt > 1 ? "s" : ""}
                        </span>
                      )}
                      {fuCnt > 0 && (
                        <span className="w-full truncate rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {fuCnt} follow-up{fuCnt > 1 ? "s" : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected day panel */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
            <p className="mb-4 text-sm font-bold text-gray-900 dark:text-gray-100">
              {selected.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <svg className="h-10 w-10 text-gray-200 dark:text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-400">Nothing scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((e) => (
                  <Link key={`${e.leadId}-${e.status}`} href={`/leads?lead=${e.leadId}`}
                    className="flex items-start gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5">
                    <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${e.status === "tour" ? "bg-amber-400" : "bg-blue-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{e.leadName}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{e.propertyName}</p>
                      <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        e.status === "tour"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}>
                        {e.status === "tour" ? "Tour Scheduled" : "Follow-Up"}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">Open →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <div className="border-b border-gray-100 px-6 py-4 dark:border-white/5">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Upcoming Events</p>
            <p className="text-xs text-gray-400 mt-0.5">Tours and follow-ups in the next 30 days</p>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4 px-6 py-4">
                  <Skeleton className="h-12 w-16" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28" /></div>
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">No upcoming tours or follow-ups.</p>
              <Link href="/leads" className="mt-2 block text-xs font-semibold text-[#C8102E] hover:underline">View all leads →</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {upcoming.map((e, i) => {
                const isNew = i === 0 || !sameDay(e.date, upcoming[i - 1].date);
                return (
                  <div key={`${e.leadId}-${e.status}`}>
                    {isNew && (
                      <div className="bg-gray-50 px-6 py-2 dark:bg-white/5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          {e.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    )}
                    <Link href={`/leads?lead=${e.leadId}`}
                      className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${e.status === "tour" ? "bg-amber-400" : "bg-blue-400"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{e.leadName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{e.propertyName}{e.source ? ` · via ${e.source}` : ""}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        e.status === "tour"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}>{e.status === "tour" ? "Tour" : "Follow-Up"}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
