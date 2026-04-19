"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  ts: string;
  ai_generated: boolean;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  property: string;
  property_phone: string;
  status: LeadStatus;
  source: string;
  preferred_contact: "sms" | "email" | "call";
  move_in_date?: string;
  bedrooms?: number;
  budget_min?: number;
  budget_max?: number;
  pets?: boolean;
  ai_score?: number;
  notes?: string;
  messages: Message[];
  ai_draft?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_LEADS: Lead[] = [
  {
    id: "1",
    name: "Jordan Ellis",
    phone: "+1 (702) 555-0101",
    email: "jordan.ellis@email.com",
    property: "The Monroe",
    property_phone: "+17025550100",
    status: "engaged",
    source: "Zillow",
    preferred_contact: "sms",
    move_in_date: "2025-08-01",
    bedrooms: 2,
    budget_min: 1800,
    budget_max: 2200,
    pets: true,
    ai_score: 8,
    notes: "Has a golden retriever. Very responsive. Likely to schedule soon.",
    ai_draft: "Absolutely! We have Saturday tours at 10am, 1pm, or 3pm. Which time works best for you, Jordan?",
    messages: [
      { id: "m1", direction: "inbound",  body: "Hi! I saw your listing on Zillow for a 2BR apartment. Is it still available?",                   ts: "2025-06-01T09:00:00Z", ai_generated: false },
      { id: "m2", direction: "outbound", body: "Hey Jordan! Thanks for reaching out to The Monroe 😊 Yes, we have 2BRs available! When are you looking to move in?", ts: "2025-06-01T09:00:47Z", ai_generated: true  },
      { id: "m3", direction: "inbound",  body: "Around August 1st ideally.",                                                                     ts: "2025-06-01T09:03:00Z", ai_generated: false },
      { id: "m4", direction: "outbound", body: "Perfect timing — we have units opening Aug 1. What's your monthly budget range?",                 ts: "2025-06-01T09:03:22Z", ai_generated: true  },
      { id: "m5", direction: "inbound",  body: "Somewhere between $1,800 and $2,200 a month.",                                                   ts: "2025-06-01T09:05:00Z", ai_generated: false },
      { id: "m6", direction: "outbound", body: "That works perfectly with our 2BR pricing! One more question — do you have any pets?",            ts: "2025-06-01T09:05:18Z", ai_generated: true  },
      { id: "m7", direction: "inbound",  body: "Yes, I have a golden retriever. Is that okay?",                                                   ts: "2025-06-01T09:07:00Z", ai_generated: false },
      { id: "m8", direction: "outbound", body: "Absolutely, we're pet-friendly! 🐾 There's a $400 pet deposit. Would you like to schedule a tour this week?", ts: "2025-06-01T09:07:31Z", ai_generated: true  },
      { id: "m9", direction: "inbound",  body: "Yes that works for me, can we do Saturday?",                                                      ts: "2025-06-01T09:10:00Z", ai_generated: false },
    ],
  },
  {
    id: "2",
    name: "Maya Thompson",
    phone: "+1 (702) 555-0102",
    email: "maya.t@gmail.com",
    property: "The Monroe",
    property_phone: "+17025550100",
    status: "contacted",
    source: "Website",
    preferred_contact: "email",
    move_in_date: "2025-07-15",
    ai_score: 5,
    ai_draft: "Hi Maya! Just checking in — are you still looking for a 1BR at The Monroe? We have July availability and would love to set up a tour for you.",
    messages: [
      { id: "m1", direction: "inbound",  body: "Hello, I'm interested in a 1BR unit available in mid-July.",                                      ts: "2025-06-03T14:22:00Z", ai_generated: false },
      { id: "m2", direction: "outbound", body: "Hi Maya! Thanks for reaching out to The Monroe. We have 1BRs available in July. What's your budget range? And do you have any pets?", ts: "2025-06-03T14:22:31Z", ai_generated: true },
    ],
  },
  {
    id: "3",
    name: "Carlos Reyes",
    phone: "+1 (702) 555-0103",
    property: "Parkview Commons",
    property_phone: "+17025550200",
    status: "tour_scheduled",
    source: "Apartments.com",
    preferred_contact: "sms",
    move_in_date: "2025-09-01",
    bedrooms: 1,
    budget_min: 1400,
    budget_max: 1700,
    pets: false,
    ai_score: 9,
    ai_draft: "Just a reminder, Carlos — your tour at Parkview Commons is tomorrow at 10am! Reply CONFIRM to confirm, or let me know if you need to reschedule.",
    messages: [
      { id: "m1", direction: "inbound",  body: "Hey, saw your listing on Apartments.com. Do you have 1BRs?",                                      ts: "2025-06-05T09:10:00Z", ai_generated: false },
      { id: "m2", direction: "outbound", body: "Hi Carlos! Yes, Parkview Commons has 1BRs available starting Sept 1. What's your budget?",        ts: "2025-06-05T09:10:41Z", ai_generated: true  },
      { id: "m3", direction: "inbound",  body: "Around $1500/mo. No pets.",                                                                       ts: "2025-06-05T09:12:00Z", ai_generated: false },
      { id: "m4", direction: "outbound", body: "Perfect fit! Our 1BRs start at $1,450. Want to come in for a tour?",                              ts: "2025-06-05T09:12:19Z", ai_generated: true  },
      { id: "m5", direction: "inbound",  body: "Yes I'd love to see the place. When are you available?",                                          ts: "2025-06-05T09:14:00Z", ai_generated: false },
      { id: "m6", direction: "outbound", body: "How does Sunday Apr 20 at 10am work for you?",                                                    ts: "2025-06-05T09:14:28Z", ai_generated: true  },
      { id: "m7", direction: "inbound",  body: "That works! See you then.",                                                                       ts: "2025-06-05T09:16:00Z", ai_generated: false },
      { id: "m8", direction: "outbound", body: "Great! You're confirmed for Sunday Apr 20 at 10am at Parkview Commons — 5670 Henderson Crest Dr. Looking forward to meeting you! 🏠", ts: "2025-06-05T09:16:33Z", ai_generated: true },
    ],
  },
  {
    id: "4",
    name: "Aisha Patel",
    phone: "+1 (702) 555-0104",
    email: "aisha.patel@work.com",
    property: "Parkview Commons",
    property_phone: "+17025550200",
    status: "applied",
    source: "Facebook",
    preferred_contact: "call",
    ai_score: 7,
    ai_draft: "Hi Aisha! I noticed your application has been open for a few days — can I help answer any questions to help you complete it?",
    messages: [
      { id: "m1", direction: "inbound",  body: "Hi, I'm interested in a 2BR. Saw your Facebook ad.",                                             ts: "2025-06-07T16:45:00Z", ai_generated: false },
      { id: "m2", direction: "outbound", body: "Hi Aisha! Welcome to Parkview Commons. We have 2BRs starting at $1,900/mo. When are you looking to move?", ts: "2025-06-07T16:45:38Z", ai_generated: true },
      { id: "m3", direction: "inbound",  body: "ASAP — within the next 3 weeks if possible.",                                                     ts: "2025-06-07T16:47:00Z", ai_generated: false },
      { id: "m4", direction: "outbound", body: "We have a 2BR available June 28 — great timing! Want to come in for a tour this week?",            ts: "2025-06-07T16:47:22Z", ai_generated: true  },
      { id: "m5", direction: "inbound",  body: "Yes, came in yesterday. It's perfect. Sending application now.",                                  ts: "2025-06-07T16:49:00Z", ai_generated: false },
      { id: "m6", direction: "outbound", body: "Amazing! So glad you loved it 🎉 Application link: parkviewcommons.com/apply — takes about 10 min. Let me know if you have any questions!", ts: "2025-06-07T16:49:15Z", ai_generated: true },
    ],
  },
  {
    id: "5",
    name: "Derek Nguyen",
    phone: "+1 (702) 555-0105",
    email: "derek.n@gmail.com",
    property: "The Monroe",
    property_phone: "+17025550100",
    status: "lost",
    source: "Manual",
    preferred_contact: "sms",
    move_in_date: "2025-07-01",
    ai_score: 2,
    messages: [
      { id: "m1", direction: "inbound",  body: "Do you have any studios available?",                                                              ts: "2025-06-10T11:30:00Z", ai_generated: false },
      { id: "m2", direction: "outbound", body: "Hi Derek! The Monroe has studios starting at $1,350/mo. When are you looking to move in?",         ts: "2025-06-10T11:30:28Z", ai_generated: true  },
      { id: "m3", direction: "outbound", body: "Hi Derek, just following up — still interested in a studio at The Monroe?",                       ts: "2025-06-13T10:00:00Z", ai_generated: true  },
      { id: "m4", direction: "outbound", body: "Hey Derek, last check-in! We have a great studio opening July 1 — happy to show you around.",     ts: "2025-06-17T10:00:00Z", ai_generated: true  },
    ],
  },
  {
    id: "6",
    name: "Priya Sharma",
    phone: "+1 (702) 555-0106",
    email: "priya.sharma@gmail.com",
    property: "The Monroe",
    property_phone: "+17025550100",
    status: "new",
    source: "Zillow",
    preferred_contact: "sms",
    ai_score: undefined,
    ai_draft: "Hi Priya! Thanks for reaching out to The Monroe. What type of unit are you looking for, and when are you hoping to move in?",
    messages: [
      { id: "m1", direction: "inbound", body: "Hello! I'm interested in available units at The Monroe. Please reach out.", ts: "2025-06-19T08:45:00Z", ai_generated: false },
    ],
  },
  {
    id: "7",
    name: "Liam Chen",
    phone: "+1 (702) 555-0107",
    property: "Parkview Commons",
    property_phone: "+17025550200",
    status: "new",
    source: "Apartments.com",
    preferred_contact: "sms",
    ai_score: undefined,
    ai_draft: "Hey Liam! Thanks for your interest in Parkview Commons. Are you looking for a 1BR or 2BR, and what's your target move-in date?",
    messages: [
      { id: "m1", direction: "inbound", body: "Hi, looking for an apartment starting in August. Do you have availability?", ts: "2025-06-19T11:20:00Z", ai_generated: false },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Config & helpers
// ─────────────────────────────────────────────────────────────────────────────

type FilterKey = "all" | "new" | "hot" | "follow_up" | "tour_scheduled" | "applied" | "lost";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",            label: "All" },
  { key: "new",            label: "New" },
  { key: "hot",            label: "Hot" },
  { key: "follow_up",      label: "Needs Follow-Up" },
  { key: "tour_scheduled", label: "Tour Scheduled" },
  { key: "applied",        label: "Applied" },
  { key: "lost",           label: "Lost" },
];

function applyFilter(leads: Lead[], filter: FilterKey): Lead[] {
  switch (filter) {
    case "new":            return leads.filter((l) => l.status === "new");
    case "hot":            return leads.filter((l) => (l.ai_score ?? 0) >= 7 || ["tour_scheduled", "applied"].includes(l.status));
    case "follow_up":      return leads.filter((l) => l.status === "contacted");
    case "tour_scheduled": return leads.filter((l) => l.status === "tour_scheduled");
    case "applied":        return leads.filter((l) => l.status === "applied");
    case "lost":           return leads.filter((l) => l.status === "lost");
    default:               return leads;
  }
}

const STATUS_STYLES: Record<LeadStatus, { bg: string; text: string; dot: string; label: string }> = {
  new:            { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-400", label: "New" },
  contacted:      { bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-400",    label: "Contacted" },
  engaged:        { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-400", label: "Engaged" },
  tour_scheduled: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400",  label: "Tour Scheduled" },
  applied:        { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-400", label: "Applied" },
  won:            { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500",  label: "Won" },
  lost:           { bg: "bg-gray-100",   text: "text-gray-500",    dot: "bg-gray-400",   label: "Lost" },
};

const AVATAR_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#F3E8FF", text: "#6D28D9" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#FCE7F3", text: "#9D174D" },
  { bg: "#E0E7FF", text: "#3730A3" },
];

function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7)   return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function msgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function msgDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatBudget(min?: number, max?: number): string {
  if (!min && !max) return "—";
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}/mo`;
  if (min) return `${fmt(min)}+/mo`;
  return `Up to ${fmt(max!)}/mo`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: LeadStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", s.bg, s.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 7 ? "bg-green-500" : score >= 4 ? "bg-amber-400" : "bg-red-400";
  const textColor = score >= 7 ? "text-green-700" : score >= 4 ? "text-amber-700" : "text-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${score * 10}%` }} />
      </div>
      <span className={cn("text-xs font-bold tabular-nums", textColor)}>{score}/10</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-xs text-gray-400">{label}</span>
      <span className="text-right text-xs font-medium text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Left panel — Lead list
// ─────────────────────────────────────────────────────────────────────────────

function LeadListPanel({
  leads,
  selectedId,
  filter,
  search,
  onSelect,
  onFilterChange,
  onSearchChange,
}: {
  leads: Lead[];
  selectedId: string;
  filter: FilterKey;
  search: string;
  onSelect: (id: string) => void;
  onFilterChange: (f: FilterKey) => void;
  onSearchChange: (q: string) => void;
}) {
  const filtered = applyFilter(
    leads.filter((l) => l.name.toLowerCase().includes(search.toLowerCase())),
    filter
  );

  return (
    <div className="flex w-[280px] shrink-0 flex-col border-r border-gray-100 bg-white">
      {/* Search */}
      <div className="border-b border-gray-100 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0 text-gray-400">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5l3 3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads…"
            className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 py-2 scrollbar-hide">
        {FILTERS.map((f) => {
          const count = applyFilter(leads, f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                filter === f.key
                  ? "bg-[#C8102E] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              )}
            >
              {f.label}
              <span className={cn(
                "rounded-full px-1 text-[9px] font-bold tabular-nums",
                filter === f.key ? "bg-white/20 text-white" : "bg-white text-gray-500"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-xs font-medium text-gray-500">No leads match this filter</p>
          </div>
        ) : (
          filtered.map((lead) => {
            const av = avatarColor(lead.id);
            const lastMsg = lead.messages[lead.messages.length - 1];
            const isSelected = lead.id === selectedId;
            const st = STATUS_STYLES[lead.status];
            const isNew = lead.status === "new" && lead.messages.length <= 1;

            return (
              <button
                key={lead.id}
                onClick={() => onSelect(lead.id)}
                className={cn(
                  "w-full border-b border-gray-50 px-3 py-3 text-left transition-colors",
                  isSelected
                    ? "border-l-2 border-l-[#C8102E] bg-red-50 pl-2.5"
                    : "hover:bg-gray-50"
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Avatar */}
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ background: av.bg, color: av.text }}
                  >
                    {initials(lead.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Name + time */}
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn("truncate text-sm font-semibold", isSelected ? "text-gray-900" : "text-gray-800")}>
                        {lead.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400">{relativeTime(lastMsg.ts)}</span>
                    </div>

                    {/* Property */}
                    <p className="mt-0.5 text-[11px] text-gray-400">{lead.property}</p>

                    {/* Last message preview */}
                    <p className="mt-1 truncate text-[11px] text-gray-500">
                      {lastMsg.direction === "outbound" && (
                        <span className="mr-1 text-gray-400">You:</span>
                      )}
                      {lastMsg.body}
                    </p>

                    {/* Status + unread indicator */}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold", st.bg, st.text)}>
                        <span className={cn("h-1 w-1 rounded-full", st.dot)} />
                        {st.label}
                      </span>
                      {isNew && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Center panel — Conversation
// ─────────────────────────────────────────────────────────────────────────────

function ConversationPanel({ lead, replyText, onReplyChange }: {
  lead: Lead;
  replyText: string;
  onReplyChange: (text: string) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const av = avatarColor(lead.id);
  const st = STATUS_STYLES[lead.status];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lead.id]);

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  for (const msg of lead.messages) {
    const date = msgDate(msg.ts);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      grouped.push({ date, msgs: [msg] });
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">

      {/* Conversation header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{ background: av.bg, color: av.text }}
          >
            {initials(lead.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{lead.name}</span>
              <StatusPill status={lead.status} />
            </div>
            <p className="text-xs text-gray-400">{lead.phone} · {lead.property}</p>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2">
          {lead.ai_score != null && (
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5">
              <span className="text-[10px] text-gray-400">AI Score</span>
              <span className={cn(
                "text-xs font-bold",
                lead.ai_score >= 7 ? "text-green-600" : lead.ai_score >= 4 ? "text-amber-600" : "text-red-500"
              )}>
                {lead.ai_score}/10
              </span>
            </div>
          )}
          <button className="rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            View Profile
          </button>
          <button className="rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            ···
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mx-auto max-w-2xl space-y-1">
          {grouped.map(({ date, msgs }) => (
            <div key={date}>
              {/* Date separator */}
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[10px] font-medium text-gray-400">{date}</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-3">
                {msgs.map((msg) => {
                  const isOut = msg.direction === "outbound";
                  return (
                    <div key={msg.id} className={cn("flex gap-2", isOut ? "flex-row-reverse" : "flex-row")}>
                      {/* Avatar for inbound */}
                      {!isOut && (
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full text-[10px] font-bold"
                          style={{ background: av.bg, color: av.text }}
                        >
                          {initials(lead.name)[0]}
                        </div>
                      )}

                      <div className={cn("flex max-w-[72%] flex-col", isOut ? "items-end" : "items-start")}>
                        {/* Bubble */}
                        <div className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                          isOut
                            ? "rounded-tr-sm bg-gray-900 text-white"
                            : "rounded-tl-sm border border-gray-100 bg-white text-gray-900 shadow-sm"
                        )}>
                          {msg.body}
                        </div>

                        {/* Time + AI indicator */}
                        <div className={cn("mt-1 flex items-center gap-1.5", isOut ? "flex-row-reverse" : "flex-row")}>
                          <span className="text-[10px] text-gray-400">{msgTime(msg.ts)}</span>
                          {isOut && msg.ai_generated && (
                            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-600">
                              AI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply box */}
      <div className="shrink-0 border-t border-gray-100 bg-white">
        {/* Quick action chips */}
        <div className="flex items-center gap-2 border-b border-gray-50 px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Quick actions</span>
          <button className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3 w-3">
              <rect x="1" y="2" width="12" height="11" rx="1.5" />
              <path d="M1 6h12M5 1v2M9 1v2" strokeLinecap="round" />
            </svg>
            Schedule Tour
          </button>
          <button className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3 w-3">
              <path d="M2 3h10a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z" />
              <path d="M1 4l6 4 6-4" strokeLinecap="round" />
            </svg>
            Send Application
          </button>
          <button className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3 w-3">
              <path d="M7 1l1.5 3 3.5.5-2.5 2.5.5 3.5L7 9l-3 1.5.5-3.5L2 4.5 5.5 4z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mark Won
          </button>
          <button className="ml-auto flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-50 transition-colors">
            Mark Lost
          </button>
        </div>

        {/* Draft area */}
        <div className="px-4 pb-4 pt-3">
          {lead.ai_draft && replyText === lead.ai_draft && (
            <div className="mb-2 flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">
                <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5">
                  <path d="M6 1l1.2 2.6L10 4l-2 2 .5 2.8L6 7.5 3.5 8.8 4 6 2 4l2.8-.4z" />
                </svg>
                AI Draft
              </span>
              <span className="text-[10px] text-gray-400">Review before sending</span>
            </div>
          )}
          <textarea
            value={replyText}
            onChange={(e) => onReplyChange(e.target.value)}
            placeholder="Type a reply or edit the AI draft above…"
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none transition-colors"
          />
          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-400">{replyText.length} chars</span>
              <button
                onClick={() => onReplyChange(lead.ai_draft ?? "")}
                className="text-[11px] font-medium text-violet-600 hover:underline"
              >
                ✨ Regenerate draft
              </button>
            </div>
            <button
              disabled={!replyText.trim()}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-semibold transition-colors",
                replyText.trim()
                  ? "bg-[#C8102E] text-white hover:bg-[#A50D25]"
                  : "cursor-not-allowed bg-gray-100 text-gray-400"
              )}
            >
              Send SMS →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Right panel — Lead detail
// ─────────────────────────────────────────────────────────────────────────────

function LeadDetailPanel({ lead }: { lead: Lead }) {
  const st = STATUS_STYLES[lead.status];

  return (
    <div className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-l border-gray-100 bg-white">

      {/* Status */}
      <div className="border-b border-gray-100 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Lead Status</p>
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", st.bg, st.text)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
            {st.label}
          </span>
          <button className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
            Change →
          </button>
        </div>

        {/* AI score */}
        {lead.ai_score != null && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">AI Quality Score</span>
            </div>
            <ScoreBar score={lead.ai_score} />
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Contact</p>
        <div className="divide-y divide-gray-50">
          <DetailRow label="Phone" value={
            <a href={`tel:${lead.phone}`} className="text-[#C8102E] hover:underline">{lead.phone}</a>
          } />
          <DetailRow label="Email" value={
            lead.email
              ? <a href={`mailto:${lead.email}`} className="text-[#C8102E] hover:underline">{lead.email}</a>
              : "—"
          } />
          <DetailRow label="Prefers" value={
            <span className="capitalize">{lead.preferred_contact}</span>
          } />
        </div>
      </div>

      {/* Qualification */}
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Qualification</p>
        <div className="divide-y divide-gray-50">
          <DetailRow label="Move-in" value={
            lead.move_in_date
              ? new Date(lead.move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "—"
          } />
          <DetailRow label="Unit type" value={
            lead.bedrooms != null
              ? lead.bedrooms === 0 ? "Studio" : `${lead.bedrooms} Bedroom`
              : "—"
          } />
          <DetailRow label="Budget" value={formatBudget(lead.budget_min, lead.budget_max)} />
          <DetailRow label="Pets" value={
            lead.pets === true ? "Yes 🐾" : lead.pets === false ? "No" : "—"
          } />
        </div>
      </div>

      {/* Property & Source */}
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Property</p>
        <div className="divide-y divide-gray-50">
          <DetailRow label="Property" value={lead.property} />
          <DetailRow label="AI Number" value={
            <span className="font-mono text-[11px]">{lead.property_phone}</span>
          } />
          <DetailRow label="Source" value={lead.source} />
          <DetailRow label="Messages" value={`${lead.messages.length} total`} />
        </div>
      </div>

      {/* Notes */}
      <div className="flex-1 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Internal Notes</p>
        <textarea
          defaultValue={lead.notes ?? ""}
          placeholder="Add a private note…"
          rows={4}
          className="w-full resize-none rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-700 placeholder-gray-400 focus:border-gray-200 focus:bg-white focus:outline-none transition-colors"
        />
        <button className="mt-2 w-full rounded-lg bg-gray-100 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition-colors">
          Save Note
        </button>
      </div>

      {/* Danger actions */}
      <div className="border-t border-gray-100 p-4 space-y-1.5">
        <button className="w-full rounded-lg border border-gray-100 py-2 text-[11px] font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          Unsubscribe Lead
        </button>
        <button className="w-full rounded-lg border border-red-100 py-2 text-[11px] font-medium text-red-400 hover:bg-red-50 transition-colors">
          Delete Lead
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [selectedId, setSelectedId]     = useState<string>(MOCK_LEADS[0].id);
  const [filter, setFilter]             = useState<FilterKey>("all");
  const [search, setSearch]             = useState<string>("");
  const [replyText, setReplyText]       = useState<string>(MOCK_LEADS[0].ai_draft ?? "");

  const selectedLead = MOCK_LEADS.find((l) => l.id === selectedId) ?? MOCK_LEADS[0];

  function handleSelectLead(id: string) {
    setSelectedId(id);
    const lead = MOCK_LEADS.find((l) => l.id === id);
    setReplyText(lead?.ai_draft ?? "");
  }

  return (
    <div className="flex h-full overflow-hidden">
      <LeadListPanel
        leads={MOCK_LEADS}
        selectedId={selectedId}
        filter={filter}
        search={search}
        onSelect={handleSelectLead}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
      />
      <ConversationPanel
        lead={selectedLead}
        replyText={replyText}
        onReplyChange={setReplyText}
      />
      <LeadDetailPanel lead={selectedLead} />
    </div>
  );
}
