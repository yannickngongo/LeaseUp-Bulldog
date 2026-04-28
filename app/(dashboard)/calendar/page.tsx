"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getOperatorEmail, authFetch } from "@/lib/demo-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadDetail {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  property_name?: string;
  property_id: string;
  follow_up_at?: string | null;
  created_at: string;
  last_contacted_at?: string | null;
  source?: string;
  bedrooms?: number;
  budget_min?: number;
  budget_max?: number;
  move_in_date?: string;
  pets?: boolean;
  ai_summary?: string;
  ai_score?: number;
  notes?: string;
}

interface Property {
  id: string;
  name: string;
}

interface TourEvent {
  tourId:       string;
  leadId:       string;
  leadName:     string;
  leadPhone:    string;
  leadDetail?:  LeadDetail;
  propertyName: string;
  propertyId:   string;
  date:         Date;
  scheduledAt:  string;
  notes?:       string;
  source?:      string;
  status:       "tour" | "followup";
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
  ai_generated: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date)  { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 dark:bg-white/5 ${className ?? ""}`} />;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtBudget(min?: number, max?: number) {
  if (min && max) return `$${min.toLocaleString()}–$${max.toLocaleString()}/mo`;
  if (max) return `Up to $${max.toLocaleString()}/mo`;
  if (min) return `$${min.toLocaleString()}+/mo`;
  return null;
}

function fmtBedrooms(n?: number) {
  if (n === undefined || n === null) return null;
  return n === 0 ? "Studio" : `${n} Bedroom${n > 1 ? "s" : ""}`;
}

// ─── Tour Prep Sheet Modal ─────────────────────────────────────────────────────

function TourPrepSheet({ event, onClose }: { event: TourEvent; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);

  useEffect(() => {
    fetch(`/api/conversations?leadId=${event.leadId}`)
      .then((r) => r.json())
      .then((j) => {
        const all: Message[] = j.messages ?? [];
        setMessages(all.slice(-8));
      })
      .finally(() => setLoadingMsgs(false));
  }, [event.leadId]);

  const lead    = event.leadDetail;
  const score   = lead?.ai_score;
  const scoreColor =
    score && score >= 8 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
    : score && score >= 5 ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
    : "text-gray-500 bg-gray-100 dark:bg-white/5 dark:text-gray-400";

  const budget    = fmtBudget(lead?.budget_min, lead?.budget_max);
  const bedrooms  = fmtBedrooms(lead?.bedrooms);
  const moveIn    = lead?.move_in_date
    ? new Date(lead.move_in_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#1C1F2E] shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] px-6 py-5 rounded-t-3xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Tour Scheduled
              </span>
              {score && (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${scoreColor}`}>
                  AI Score {score}/10
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{event.leadName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {event.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {fmtTime(event.scheduledAt)} · {event.propertyName}
            </p>
          </div>
          <button onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            <a href={`tel:${event.leadPhone}`}
              className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/3 p-3.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-white/10 shadow-sm">
                <svg className="h-4 w-4 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Phone</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{event.leadPhone}</p>
              </div>
            </a>
            {lead?.email ? (
              <a href={`mailto:${lead.email}`}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/3 p-3.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-white/10 shadow-sm">
                  <svg className="h-4 w-4 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{lead.email}</p>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/3 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-white/10 shadow-sm">
                  <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email</p>
                  <p className="text-sm text-gray-400">Not provided</p>
                </div>
              </div>
            )}
          </div>

          {/* What they're looking for */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">What They Need</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Bedrooms", value: bedrooms ?? "Not specified", icon: "🛏" },
                { label: "Budget",   value: budget ?? "Not specified",   icon: "💰" },
                { label: "Move-In",  value: moveIn ?? "Not specified",   icon: "📅" },
                { label: "Pets",     value: lead?.pets === true ? "Yes" : lead?.pets === false ? "No" : "Not specified", icon: "🐾" },
              ].map((item) => (
                <div key={item.label}
                  className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/3 p-3 text-center">
                  <p className="text-lg">{item.icon}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lead source */}
          {lead?.source && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-bold uppercase tracking-wider">Source:</span>
              <span className="capitalize">{lead.source}</span>
            </div>
          )}

          {/* AI Summary */}
          {lead?.ai_summary && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">AI Summary</p>
              <div className="rounded-2xl border border-violet-100 dark:border-violet-800/30 bg-violet-50 dark:bg-violet-900/10 p-4">
                <p className="text-sm leading-relaxed text-violet-900 dark:text-violet-200">{lead.ai_summary}</p>
              </div>
            </div>
          )}

          {/* Agent notes */}
          {lead?.notes && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Notes</p>
              <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/3 p-4">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{lead.notes}</p>
              </div>
            </div>
          )}

          {/* Tour notes */}
          {event.notes && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Booking Note</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{event.notes}</p>
            </div>
          )}

          {/* Recent conversation */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Recent Conversation</p>
            {loadingMsgs ? (
              <div className="space-y-2">
                {[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-400">No messages yet.</p>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.direction === "outbound"
                        ? "bg-[#C8102E] text-white rounded-br-sm"
                        : "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                    }`}>
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] px-6 py-4 rounded-b-3xl flex items-center justify-between gap-3">
          <Link href={`/leads?lead=${event.leadId}`}
            className="text-sm font-semibold text-[#C8102E] hover:underline">
            View full conversation →
          </Link>
          <button onClick={onClose}
            className="rounded-xl bg-gray-100 dark:bg-white/10 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [current, setCurrent]     = useState(new Date());
  const [selected, setSelected]   = useState<Date>(new Date());
  const [tours, setTours]         = useState<TourEvent[]>([]);
  const [followUps, setFollowUps] = useState<TourEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<"month" | "list">("month");
  const [prepSheet, setPrepSheet] = useState<TourEvent | null>(null);

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

      // Fetch tours + leads in parallel per property
      const allTourRows: Array<{
        id: string; scheduled_at: string; status: string; notes?: string;
        lead_id: string; property_id: string;
        leads: { name: string; phone: string };
        properties: { name: string };
      }> = [];
      const allLeads: LeadDetail[] = [];

      await Promise.all(props.map(async (p) => {
        const [tourRes, leadRes] = await Promise.all([
          fetch(`/api/tours?propertyId=${p.id}`),
          fetch(`/api/leads?propertyId=${p.id}`),
        ]);
        const tourJson = await tourRes.json();
        const leadJson = await leadRes.json();
        allTourRows.push(...(tourJson.tours ?? []));
        const rows: LeadDetail[] = leadJson.leads ?? [];
        rows.forEach((l) => { l.property_name = p.name; });
        allLeads.push(...rows);
      }));

      // Build lead lookup map
      const leadMap = new Map(allLeads.map((l) => [l.id, l]));

      const tourEvents: TourEvent[] = allTourRows
        .filter((t) => t.status === "scheduled")
        .map((t) => ({
          tourId:       t.id,
          leadId:       t.lead_id,
          leadName:     t.leads?.name ?? "Unknown",
          leadPhone:    t.leads?.phone ?? "",
          leadDetail:   leadMap.get(t.lead_id),
          propertyName: t.properties?.name ?? "Unknown Property",
          propertyId:   t.property_id,
          date:         new Date(t.scheduled_at),
          scheduledAt:  t.scheduled_at,
          notes:        t.notes,
          status:       "tour",
        }));

      const now = new Date();
      const fuEvents: TourEvent[] = allLeads
        .filter((l) => l.follow_up_at && new Date(l.follow_up_at) > now && l.status !== "tour_scheduled")
        .map((l) => ({
          tourId:       `fu-${l.id}`,
          leadId:       l.id,
          leadName:     l.name,
          leadPhone:    l.phone,
          leadDetail:   l,
          propertyName: l.property_name ?? "Unknown Property",
          propertyId:   l.property_id,
          date:         new Date(l.follow_up_at!),
          scheduledAt:  l.follow_up_at!,
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
  const selectedEvents = allEvents.filter((e) => sameDay(e.date, selected));
  function eventsOnDate(d: Date) { return allEvents.filter((e) => sameDay(e.date, d)); }

  const monthStart     = startOfMonth(current);
  const startDayOfWeek = monthStart.getDay();
  const totalDays      = daysInMonth(current);
  const today          = new Date();

  function prevMonth() { setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1)); }
  function nextMonth() { setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1)); }
  function goToday()   { setCurrent(new Date()); setSelected(new Date()); }

  const now = new Date();
  const upcoming = allEvents
    .filter((e) => e.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 30);

  function openEvent(e: TourEvent) {
    if (e.status === "tour") setPrepSheet(e);
    else window.location.href = `/leads?lead=${e.leadId}`;
  }

  return (
    <div className="flex h-full flex-col space-y-0 p-4 lg:p-6 gap-4">

      {/* Tour Prep Sheet modal */}
      {prepSheet && <TourPrepSheet event={prepSheet} onClose={() => setPrepSheet(null)} />}

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
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/5">
              <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <p className="font-bold text-gray-900 dark:text-gray-100">{MONTHS[current.getMonth()]} {current.getFullYear()}</p>
              <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-gray-50 dark:border-white/5">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{d}</div>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-7">
                {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="m-1 h-14" />)}
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[64px] border-b border-r border-gray-50 dark:border-white/5" />
                ))}
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
                      }`}>
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
                  <button key={e.tourId} onClick={() => openEvent(e)}
                    className="w-full flex items-start gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5 text-left">
                    <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${e.status === "tour" ? "bg-amber-400" : "bg-blue-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{e.leadName}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{e.propertyName}</p>
                      {e.status === "tour" && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmtTime(e.scheduledAt)}</p>
                      )}
                      <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        e.status === "tour"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}>
                        {e.status === "tour" ? "Tap for Prep Sheet" : "Follow-Up"}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">{e.status === "tour" ? "Prep →" : "Open →"}</span>
                  </button>
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
                  <div key={e.tourId}>
                    {isNew && (
                      <div className="bg-gray-50 px-6 py-2 dark:bg-white/5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          {e.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    )}
                    <button onClick={() => openEvent(e)}
                      className="w-full flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/3 text-left">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${e.status === "tour" ? "bg-amber-400" : "bg-blue-400"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{e.leadName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {e.propertyName}{e.status === "tour" ? ` · ${fmtTime(e.scheduledAt)}` : e.source ? ` · via ${e.source}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        e.status === "tour"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}>{e.status === "tour" ? "Tour" : "Follow-Up"}</span>
                    </button>
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
