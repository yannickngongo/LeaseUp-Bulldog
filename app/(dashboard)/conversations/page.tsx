"use client";

// /conversations — KeyVue-inspired 3-column chat workspace.
// Left: lead list (sortable, searchable, filterable by property).
// Center: SMS thread with header + bubbles + reply input.
// Right: lead details panel (status, qualification, AI score, quick actions).

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authFetch, getOperatorEmail } from "@/lib/demo-auth";

type LeadStatus = "new" | "contacted" | "engaged" | "tour_scheduled" | "applied" | "won" | "lost";
type Direction = "inbound" | "outbound";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  property_id?: string;
  property_name?: string;
  source?: string;
  move_in_date?: string;
  bedrooms?: number;
  budget_min?: number;
  budget_max?: number;
  pets?: boolean;
  ai_score?: number;
  ai_summary?: string;
  ai_paused?: boolean;
  human_takeover?: boolean;
  created_at: string;
  last_contacted_at?: string;
}

interface Message {
  id: string;
  created_at: string;
  direction: Direction;
  body: string;
  ai_generated?: boolean;
  twilio_sid?: string;
}

interface Property {
  id: string;
  name: string;
}

const STATUS_DOT: Record<LeadStatus, string> = {
  new:            "bg-indigo-400",
  contacted:      "bg-sky-400",
  engaged:        "bg-violet-400",
  tour_scheduled: "bg-amber-400",
  applied:        "bg-orange-400",
  won:            "bg-green-500",
  lost:           "bg-gray-400",
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New", contacted: "Contacted", engaged: "Engaged",
  tour_scheduled: "Tour booked", applied: "Applied", won: "Won", lost: "Lost",
};

function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function avatarGradient(id: string): string {
  const palette = [
    "linear-gradient(135deg, #C8102E, #A50D25)",
    "linear-gradient(135deg, #A78BFA, #7C5BE6)",
    "linear-gradient(135deg, #F59E0B, #D97706)",
    "linear-gradient(135deg, #F87171, #C8102E)",
    "linear-gradient(135deg, #34D399, #059669)",
  ];
  return palette[id.charCodeAt(0) % palette.length];
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("") || "?";
}

// ─── Workspace ────────────────────────────────────────────────────────────────
function ConversationsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads]           = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [search, setSearch]         = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");

  const [activeLeadId, setActiveLeadId] = useState<string | null>(searchParams.get("lead"));
  const [activeLead, setActiveLead]     = useState<Lead | null>(null);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  // Latest known message IDs — used to flag "new" entries for entrance animation
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());

  // ── Load leads list (top-level) ───────────────────────────────────────────
  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const email = await getOperatorEmail();
      if (!email) { router.push("/setup"); return; }

      const propRes = await authFetch("/api/properties");
      const propJson = await propRes.json();
      const props: Property[] = propJson.properties ?? [];
      setProperties(props);

      const all: Lead[] = [];
      await Promise.all(props.map(async (p) => {
        const r = await authFetch(`/api/leads?propertyId=${p.id}`);
        const j = await r.json();
        const rows = (j.leads ?? []) as Lead[];
        rows.forEach((l) => { l.property_name = p.name; });
        all.push(...rows);
      }));

      all.sort((a, b) => {
        const ta = new Date(a.last_contacted_at ?? a.created_at).getTime();
        const tb = new Date(b.last_contacted_at ?? b.created_at).getTime();
        return tb - ta;
      });
      setLeads(all);

      // Auto-pick the most recent lead — but only on desktop. On mobile, show the
      // list first so the user can choose which thread to open.
      if (!activeLeadId && all.length) {
        const isDesktop = typeof window !== "undefined"
          && window.matchMedia("(min-width: 768px)").matches;
        if (isDesktop) setActiveLeadId(all[0].id);
      }
    } finally {
      setLoadingLeads(false);
    }
  }, [router, activeLeadId]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // ── Load thread for active lead ───────────────────────────────────────────
  const loadThread = useCallback(async (leadId: string, isPoll = false) => {
    if (!isPoll) setLoadingThread(true);
    try {
      const r = await authFetch(`/api/conversations?leadId=${leadId}`);
      if (!r.ok) return;
      const j = await r.json();
      const msgs = (j.messages ?? []) as Message[];
      const lead = j.lead as Lead | null;

      // Mark new messages for entrance animation
      const fresh = new Set<string>();
      msgs.forEach((m) => {
        if (!seenIdsRef.current.has(m.id)) {
          fresh.add(m.id);
          seenIdsRef.current.add(m.id);
        }
      });
      setMessages(msgs);
      if (lead) {
        if (lead.property_id) {
          const prop = properties.find((p) => p.id === lead.property_id);
          if (prop) lead.property_name = prop.name;
        }
        setActiveLead(lead);
      }

      if (fresh.size && isPoll) {
        setNewMessageIds(fresh);
        // Clear the "new" flag after the animation completes
        setTimeout(() => setNewMessageIds(new Set()), 800);
      }
    } finally {
      if (!isPoll) setLoadingThread(false);
    }
  }, [properties]);

  useEffect(() => {
    if (!activeLeadId) return;
    seenIdsRef.current = new Set(); // reset when switching leads
    loadThread(activeLeadId);
    // Push lead id to URL (no scroll, no reload)
    const url = new URL(window.location.href);
    url.searchParams.set("lead", activeLeadId);
    window.history.replaceState({}, "", url.toString());
  }, [activeLeadId, loadThread]);

  // Poll the thread every 8s while one is open
  useEffect(() => {
    if (!activeLeadId) return;
    const id = setInterval(() => loadThread(activeLeadId, true), 8000);
    return () => clearInterval(id);
  }, [activeLeadId, loadThread]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredLeads = leads.filter((l) => {
    if (propertyFilter !== "all" && l.property_id !== propertyFilter) return false;
    if (search.trim() && !l.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  // ── Last message preview map (for sidebar) ───────────────────────────────
  const lastMessagePreview = (lead: Lead): string => {
    if (lead.id === activeLeadId && messages.length > 0) {
      return messages[messages.length - 1].body.slice(0, 40);
    }
    return lead.ai_summary ? lead.ai_summary.slice(0, 40) : "Tap to view conversation";
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-[#EDEFF3] dark:bg-[#0A0B11]">
      {/* ── Left sidebar: lead list ─────────────────────────────────────── */}
      {/* Mobile: visible when no lead is selected (so user can pick one).
          Desktop: always visible. */}
      <aside className={`${activeLeadId ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-gray-200/70 bg-white dark:border-[#1E1E2E] dark:bg-[#10101A] md:w-80`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 pt-5 pb-3">
          <Link href="/dashboard" className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
              <polyline points="10 13 5 8 10 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Chat</h2>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400">
              <circle cx="7" cy="7" r="5" /><line x1="14" y1="14" x2="10.5" y2="10.5" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-gray-100 bg-[#F4F6F8] py-2 pl-9 pr-3 text-xs text-gray-800 placeholder:text-gray-400 transition-colors focus:border-[#C8102E]/40 focus:bg-white focus:outline-none dark:border-white/5 dark:bg-white/5 dark:text-gray-200 dark:placeholder:text-gray-600 dark:focus:bg-white/10"
            />
          </div>
        </div>

        {/* Property filter */}
        {properties.length > 1 && (
          <div className="px-5 pb-3">
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 transition-colors focus:border-[#C8102E]/40 focus:outline-none dark:border-white/5 dark:bg-white/5 dark:text-gray-300"
            >
              <option value="all">All properties</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {/* List heading */}
        <div className="flex items-center justify-between px-5 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400">
            Last chats
          </span>
          <span className="text-[10px] text-gray-400">{filteredLeads.length}</span>
        </div>

        {/* Lead list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loadingLeads ? (
            <div className="space-y-1.5 px-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-gray-400">
                {leads.length === 0 ? "No conversations yet." : "No matches."}
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredLeads.map((lead) => {
                const active = lead.id === activeLeadId;
                return (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => setActiveLeadId(lead.id)}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active
                          ? "bg-[#FFF4F6] dark:bg-[#1E1E2E]"
                          : "hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      {/* Active indicator bar (animated slide-in) */}
                      <span
                        className={`absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#C8102E] transition-all duration-300 ${
                          active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
                        }`}
                      />
                      {/* Avatar */}
                      <div
                        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: avatarGradient(lead.id) }}
                      >
                        {initials(lead.name)}
                        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#10101A] ${STATUS_DOT[lead.status]}`} />
                      </div>
                      {/* Name + preview */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm ${active ? "font-bold text-gray-900 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-200"}`}>
                            {lead.name}
                          </span>
                          <span className="shrink-0 text-[10px] text-gray-400">
                            {relativeTime(lead.last_contacted_at ?? lead.created_at)}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-gray-500 dark:text-gray-500">
                          {lastMessagePreview(lead)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Center: thread ──────────────────────────────────────────────── */}
      {/* Mobile: hidden until a lead is picked. Desktop: always visible. */}
      <main className={`${activeLeadId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-[#F7F8FA] dark:bg-[#0F0F18]`}>
        {!activeLeadId || !activeLead ? (
          <EmptyState />
        ) : (
          <ChatThread
            lead={activeLead}
            messages={messages}
            loading={loadingThread}
            newMessageIds={newMessageIds}
            onBack={() => setActiveLeadId(null)}
            onSendComplete={() => loadThread(activeLead.id)}
            onAiToggle={(paused) => setActiveLead({ ...activeLead, ai_paused: paused })}
          />
        )}
      </main>

      {/* ── Right: details panel ─────────────────────────────────────────── */}
      <aside className="hidden w-80 shrink-0 flex-col border-l border-gray-200/70 bg-white p-5 dark:border-[#1E1E2E] dark:bg-[#10101A] xl:flex">
        {activeLead ? <LeadDetailsPanel lead={activeLead} /> : null}
      </aside>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#C8102E]/10 animate-pulse">
        <svg viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth={1.75} className="h-8 w-8">
          <path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H8l-5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-base font-bold text-gray-900 dark:text-white">No conversation selected</h3>
      <p className="mt-1 max-w-xs text-sm text-gray-500">
        Pick a lead from the list to view their thread, or wait for a new lead to come in.
      </p>
    </div>
  );
}

// ─── Chat thread ─────────────────────────────────────────────────────────────
function ChatThread({
  lead, messages, loading, newMessageIds, onBack, onSendComplete, onAiToggle,
}: {
  lead: Lead;
  messages: Message[];
  loading: boolean;
  newMessageIds: Set<string>;
  onBack: () => void;
  onSendComplete: () => void;
  onAiToggle: (paused: boolean) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Autoscroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, lead.id]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200/70 bg-white px-4 py-4 dark:border-[#1E1E2E] dark:bg-[#10101A] sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile back-to-list button */}
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white md:hidden"
            aria-label="Back to conversations list"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
              <polyline points="10 13 5 8 10 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: avatarGradient(lead.id) }}
          >
            {initials(lead.name)}
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">{lead.name}</h2>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[lead.status]}`} />
                {STATUS_LABEL[lead.status]}
              </span>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <span className="truncate">{lead.property_name ?? "—"}</span>
            </div>
          </div>
        </div>
        <Link
          href={`/leads/${lead.id}`}
          className="hidden rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:border-[#C8102E]/40 hover:text-[#C8102E] sm:inline-block dark:border-white/10 dark:text-gray-300"
        >
          Open profile →
        </Link>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {loading && messages.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 ? "justify-start" : "justify-end"}`}>
                <div className="h-10 w-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-12 text-center text-sm text-gray-400">No messages yet — say hi!</p>
        ) : (
          <ul className="space-y-4">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              // Group consecutive messages from the same sender within 2 minutes
              const grouped =
                prev &&
                prev.direction === m.direction &&
                new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 120_000;
              const isNew = newMessageIds.has(m.id);
              return (
                <MessageBubble key={m.id} message={m} lead={lead} grouped={!!grouped} isNew={isNew} />
              );
            })}
          </ul>
        )}
      </div>

      {/* Input */}
      <ChatInput
        leadId={lead.id}
        leadName={lead.name}
        aiPaused={Boolean(lead.ai_paused)}
        onSendComplete={onSendComplete}
        onAiToggle={onAiToggle}
      />
    </>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────
function MessageBubble({
  message, lead, grouped, isNew,
}: {
  message: Message;
  lead: Lead;
  grouped: boolean;
  isNew: boolean;
}) {
  const isOutbound = message.direction === "outbound";
  const isAi = isOutbound && message.ai_generated;

  return (
    <li
      className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
      style={{
        animation: isNew ? "lub-bubble-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)" : "lub-bubble-mount 0.3s ease-out",
        animationFillMode: "both",
      }}
    >
      {/* Inbound avatar */}
      {!isOutbound && !grouped && (
        <div
          className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full text-[10px] font-bold text-white"
          style={{ background: avatarGradient(lead.id) }}
        >
          {initials(lead.name)}
        </div>
      )}
      {!isOutbound && grouped && <div className="mr-2 w-8 shrink-0" />}

      <div className={`flex max-w-[75%] flex-col ${isOutbound ? "items-end" : "items-start"}`}>
        {/* Sender label (above first message in a group) */}
        {!grouped && (
          <span className="mb-1 px-3 text-[10px] font-medium text-gray-400">
            {isOutbound
              ? `${isAi ? "Bulldog AI" : "You"}, ${formatTime(message.created_at)}`
              : `${lead.name}, ${formatTime(message.created_at)}`}
          </span>
        )}
        {/* Bubble */}
        <div
          className={`relative px-4 py-2.5 text-sm leading-snug shadow-sm ${
            isOutbound
              ? isAi
                ? "rounded-2xl rounded-br-sm bg-[#EDE9FE] text-gray-900 dark:bg-[#3A2F66] dark:text-gray-100"
                : "rounded-2xl rounded-br-sm bg-[#C8102E] text-white"
              : "rounded-2xl rounded-bl-sm bg-white text-gray-800 dark:bg-[#1E1E2E] dark:text-gray-200"
          }`}
        >
          {message.body}
        </div>
        {/* AI tag */}
        {isAi && !grouped && (
          <span className="mt-1 px-3 text-[9px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            ✦ AI generated
          </span>
        )}
      </div>
    </li>
  );
}

// ─── Chat input (with auto AI-pause) ────────────────────────────────────────
function ChatInput({
  leadId, leadName, aiPaused, onSendComplete, onAiToggle,
}: {
  leadId: string;
  leadName: string;
  aiPaused: boolean;
  onSendComplete: () => void;
  onAiToggle: (paused: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTogglingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleFirstKeystroke() {
    if (aiPaused || autoTogglingRef.current) return;
    autoTogglingRef.current = true;
    onAiToggle(true);
    try {
      await authFetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_paused: true }),
      });
    } catch {
      onAiToggle(false);
    } finally {
      autoTogglingRef.current = false;
    }
  }

  async function toggleAi(paused: boolean) {
    onAiToggle(paused);
    try {
      await authFetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_paused: paused }),
      });
    } catch {
      onAiToggle(!paused);
    }
  }

  async function handleSend() {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await authFetch("/api/sms/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, message }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Send failed (${res.status})`);
      }
      setText("");
      onSendComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  // Auto-grow
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  return (
    <div className="border-t border-gray-200/70 bg-white px-6 py-4 dark:border-[#1E1E2E] dark:bg-[#10101A]">
      {/* AI status */}
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          {aiPaused ? (
            <>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">AI paused</span>
              <span className="text-gray-500">— you have the wheel</span>
            </>
          ) : (
            <>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              </span>
              <span className="font-semibold text-green-700 dark:text-green-400">AI active</span>
              <span className="text-gray-500">— Bulldog is replying</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => toggleAi(!aiPaused)}
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
            aiPaused
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
          }`}
        >
          {aiPaused ? "Resume AI" : "Pause AI"}
        </button>
      </div>

      {/* Textarea */}
      <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-[#F7F8FA] px-4 py-2.5 transition-colors focus-within:border-[#C8102E]/40 focus-within:bg-white dark:border-white/5 dark:bg-white/5 dark:focus-within:bg-white/10">
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          placeholder={`Reply to ${leadName}…`}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.length === 1) handleFirstKeystroke();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="max-h-40 flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C8102E] text-white shadow-[0_4px_12px_rgba(200,16,46,0.35)] transition-all hover:scale-105 hover:bg-[#A50D25] active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none disabled:hover:scale-100"
          aria-label="Send"
        >
          {sending ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} strokeDasharray="48" strokeDashoffset="32" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 -translate-x-px translate-y-px">
              <path d="M2 8l12-6-4 14-3-6-5-2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-1.5 text-[11px] text-red-600">⚠ {error}</p>
      )}

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes lub-bubble-in {
          0%   { opacity: 0; transform: translateY(8px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes lub-bubble-mount {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Right details panel ─────────────────────────────────────────────────────
function LeadDetailsPanel({ lead }: { lead: Lead }) {
  const items: { label: string; value: string }[] = [
    { label: "Phone",     value: lead.phone },
    { label: "Email",     value: lead.email ?? "—" },
    { label: "Property",  value: lead.property_name ?? "—" },
    { label: "Source",    value: lead.source ?? "—" },
    { label: "Move-in",   value: lead.move_in_date ?? "—" },
    { label: "Bedrooms",  value: lead.bedrooms != null ? `${lead.bedrooms}` : "—" },
    { label: "Budget",    value: lead.budget_min && lead.budget_max ? `$${lead.budget_min}–$${lead.budget_max}` : "—" },
    { label: "Pets",      value: lead.pets == null ? "—" : lead.pets ? "Yes" : "No" },
  ];

  return (
    <div className="flex h-full flex-col">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Details</h3>

      {/* Avatar */}
      <div className="mt-5 flex flex-col items-center text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold text-white shadow-[0_8px_24px_rgba(200,16,46,0.25)]"
          style={{ background: avatarGradient(lead.id) }}
        >
          {initials(lead.name)}
        </div>
        <p className="mt-3 text-sm font-bold text-gray-900 dark:text-white">{lead.name}</p>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-white/5 dark:text-gray-300">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[lead.status]}`} />
          {STATUS_LABEL[lead.status]}
        </span>
      </div>

      {/* AI score (highlight) */}
      {typeof lead.ai_score === "number" && (
        <div className="mt-5 rounded-xl bg-gradient-to-br from-violet-50 to-pink-50 p-3 dark:from-violet-950/40 dark:to-pink-950/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
              AI Score
            </span>
            <span className="text-lg font-black text-gray-900 dark:text-white">{lead.ai_score}/10</span>
          </div>
          {lead.ai_summary && (
            <p className="mt-1.5 text-[11px] leading-snug text-gray-700 dark:text-gray-300">
              {lead.ai_summary}
            </p>
          )}
        </div>
      )}

      {/* Field grid */}
      <dl className="mt-5 space-y-2.5 text-xs">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between gap-3">
            <dt className="text-gray-400">{it.label}</dt>
            <dd className="truncate text-right font-semibold text-gray-800 dark:text-gray-200">{it.value}</dd>
          </div>
        ))}
      </dl>

      {/* Quick action */}
      <div className="mt-auto pt-5">
        <Link
          href={`/leads/${lead.id}`}
          className="block rounded-xl bg-gray-100 py-2.5 text-center text-xs font-bold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
        >
          Open full profile →
        </Link>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={null}>
      <ConversationsInner />
    </Suspense>
  );
}
