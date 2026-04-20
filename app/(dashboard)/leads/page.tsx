"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type LeadStatus = "new" | "contacted" | "engaged" | "tour_scheduled" | "applied" | "won" | "lost";

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
  ai_generated: boolean;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  property_id: string;
  property_name?: string;
  property_phone?: string;
  status: LeadStatus;
  source: string;
  preferred_contact: "sms" | "email" | "call";
  move_in_date?: string;
  bedrooms?: number;
  budget_min?: number;
  budget_max?: number;
  pets?: boolean;
  ai_score?: number;
  ai_summary?: string;
  notes?: string;
  created_at: string;
  last_contacted_at?: string;
}

interface Property {
  id: string;
  name: string;
  phone_number: string;
}

type FilterKey = "all" | "new" | "hot" | "follow_up" | "tour_scheduled" | "applied" | "lost";

// ─────────────────────────────────────────────────────────────────────────────
// Status config — vivid colors like the reference deal cards
// ─────────────────────────────────────────────────────────────────────────────

const STATUS: Record<LeadStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  new:            { label: "New",         bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE", dot: "#6366F1" },
  contacted:      { label: "Contacted",   bg: "#ECFEFF", text: "#0E7490", border: "#A5F3FC", dot: "#06B6D4" },
  engaged:        { label: "Engaged",     bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE", dot: "#8B5CF6" },
  tour_scheduled: { label: "Tour Booked", bg: "#FFFBEB", text: "#B45309", border: "#FDE68A", dot: "#F59E0B" },
  applied:        { label: "Applied",     bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA", dot: "#F97316" },
  won:            { label: "Won",         bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0", dot: "#10B981" },
  lost:           { label: "Lost",        bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB", dot: "#9CA3AF" },
};

// Vivid card colors for the top "hot leads" strip — like image 2's colored deal cards
const CARD_THEMES = [
  { bg: "#3B3BF9", text: "#fff", sub: "rgba(255,255,255,0.65)" },
  { bg: "#0ABAB5", text: "#fff", sub: "rgba(255,255,255,0.65)" },
  { bg: "#1a1a2e", text: "#fff", sub: "rgba(255,255,255,0.55)" },
  { bg: "#F59E0B", text: "#1a1100", sub: "rgba(26,17,0,0.55)" },
  { bg: "#C8102E", text: "#fff", sub: "rgba(255,255,255,0.65)" },
];

const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#4338CA" },
  { bg: "#F0FDF4", text: "#166534" },
  { bg: "#FDF4FF", text: "#86198F" },
  { bg: "#FFFBEB", text: "#92400E" },
  { bg: "#FFF1F2", text: "#BE123C" },
  { bg: "#F0F9FF", text: "#0369A1" },
];

function avatarFor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

function cardThemeFor(id: string) {
  return CARD_THEMES[id.charCodeAt(0) % CARD_THEMES.length];
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
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
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

function applyFilter(leads: Lead[], filter: FilterKey): Lead[] {
  switch (filter) {
    case "new":            return leads.filter((l) => l.status === "new");
    case "hot":            return leads.filter((l) => (l.ai_score ?? 0) >= 7 || ["tour_scheduled","applied"].includes(l.status));
    case "follow_up":      return leads.filter((l) => l.status === "contacted");
    case "tour_scheduled": return leads.filter((l) => l.status === "tour_scheduled");
    case "applied":        return leads.filter((l) => l.status === "applied");
    case "lost":           return leads.filter((l) => l.status === "lost");
    default:               return leads;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Lead Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [phone, setPhone]           = useState("");
  const [email, setEmail]           = useState("");
  const [moveIn, setMoveIn]         = useState("");
  const [unitType, setUnitType]     = useState("");
  const [budgetMin, setBudgetMin]   = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const [aiMessage, setAiMessage]   = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user?.email) return;
      const res = await fetch(`/api/properties?email=${encodeURIComponent(user.email)}`);
      const json = await res.json();
      if (json.properties?.length) { setProperties(json.properties); setPropertyId(json.properties[0].id); }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const body: Record<string, unknown> = { propertyId, firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), source: "manual" };
      if (email.trim()) body.email = email.trim();
      if (moveIn)       body.desiredMoveDate = moveIn;
      if (unitType)     body.unitType = unitType;
      if (budgetMin)    body.budget = { min: parseInt(budgetMin) };
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      setAiMessage(json.message ?? ""); setSuccess(true);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all";

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2} className="h-8 w-8">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="mb-1 text-xl font-bold text-gray-900">Lead Added!</h3>
          <p className="mb-5 text-sm text-gray-500">AI welcome SMS sent automatically</p>
          {aiMessage && (
            <div className="mb-6 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-left">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-500">AI sent</p>
              <p className="text-sm leading-relaxed text-violet-800">{aiMessage}</p>
            </div>
          )}
          <button onClick={() => { onAdded(); onClose(); }}
            className="w-full rounded-2xl bg-[#C8102E] py-3 text-sm font-bold text-white shadow-lg hover:bg-[#A50D25] transition-colors"
            style={{ boxShadow: "0 8px 24px rgba(200,16,46,0.25)" }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add New Lead</h2>
            <p className="text-xs text-gray-400 mt-0.5">AI sends a welcome SMS instantly</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Property</label>
            {properties.length === 0 ? <p className="text-sm text-gray-400">Loading…</p> :
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required className={inputCls}>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            }
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jordan" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ellis" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone Number</label>
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+17025550101" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Email <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@email.com" className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Move-in</label>
              <input type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</label>
              <select value={unitType} onChange={(e) => setUnitType(e.target.value)} className={inputCls}>
                <option value="">Any</option>
                <option value="studio">Studio</option>
                <option value="1br">1 BR</option>
                <option value="2br">2 BR</option>
                <option value="3br">3 BR</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget Min</label>
              <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="$1,500" className={inputCls} />
            </div>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !propertyId || !firstName || !lastName || !phone}
              className={cn("flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-all",
                loading || !propertyId || !firstName || !lastName || !phone
                  ? "cursor-not-allowed bg-gray-200 text-gray-400"
                  : "bg-[#C8102E] hover:bg-[#A50D25]"
              )}
              style={(!loading && propertyId && firstName && lastName && phone) ? { boxShadow: "0 8px 20px rgba(200,16,46,0.25)" } : {}}>
              {loading ? "Adding…" : "Add + Send SMS →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats bar (like image 2's header KPIs)
// ─────────────────────────────────────────────────────────────────────────────

function StatChip({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: color + "18" }}>
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums text-gray-900 leading-none">{value}</p>
        <p className="mt-0.5 text-[11px] text-gray-400">{label}{sub && <span className="ml-1.5 font-semibold" style={{ color }}>{sub}</span>}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hot lead cards (like image 2's colored deal cards)
// ─────────────────────────────────────────────────────────────────────────────

function HotLeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const theme = cardThemeFor(lead.id);
  const sc = STATUS[lead.status];
  return (
    <button onClick={onClick}
      className="shrink-0 w-44 rounded-2xl p-4 text-left transition-transform hover:scale-[1.02] active:scale-[0.99]"
      style={{ background: theme.bg, boxShadow: `0 4px 20px ${theme.bg}60` }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.sub }}>
          {relativeTime(lead.created_at)}
        </span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold"
          style={{ background: "rgba(255,255,255,0.2)", color: theme.text }}>
          {sc.label}
        </span>
      </div>
      <p className="text-sm font-bold leading-tight" style={{ color: theme.text }}>{lead.name}</p>
      <p className="mt-0.5 text-[11px]" style={{ color: theme.sub }}>{lead.property_name}</p>
      {lead.ai_score != null && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div className="h-full rounded-full" style={{ width: `${lead.ai_score * 10}%`, background: theme.text }} />
          </div>
          <span className="text-[10px] font-bold" style={{ color: theme.text }}>{lead.ai_score}/10</span>
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Left panel — lead list
// ─────────────────────────────────────────────────────────────────────────────

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "hot", label: "Hot" },
  { key: "follow_up", label: "Follow-up" },
  { key: "tour_scheduled", label: "Tours" },
  { key: "applied", label: "Applied" },
  { key: "lost", label: "Lost" },
];

function LeftPanel({ leads, selectedId, filter, search, loading, onSelect, onFilterChange, onSearchChange, onAddLead }: {
  leads: Lead[]; selectedId: string; filter: FilterKey; search: string; loading: boolean;
  onSelect: (id: string) => void; onFilterChange: (f: FilterKey) => void;
  onSearchChange: (q: string) => void; onAddLead: () => void;
}) {
  const filtered = applyFilter(leads.filter((l) => l.name.toLowerCase().includes(search.toLowerCase())), filter);

  return (
    <div className="flex w-full flex-col sm:w-[280px]">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Leads</h2>
            <p className="text-xs text-gray-400">{leads.length} total contacts</p>
          </div>
          <button onClick={onAddLead}
            className="flex items-center gap-1.5 rounded-xl bg-[#C8102E] px-3 py-2 text-xs font-bold text-white hover:bg-[#A50D25] transition-colors"
            style={{ boxShadow: "0 4px 12px rgba(200,16,46,0.3)" }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
            </svg>
            Add Lead
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0 text-gray-400">
            <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5l3 3" strokeLinecap="round" />
          </svg>
          <input type="text" value={search} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads…"
            className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 py-2 scrollbar-hide">
        {FILTERS.map((f) => {
          const count = applyFilter(leads, f.key).length;
          return (
            <button key={f.key} onClick={() => onFilterChange(f.key)}
              className={cn("flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                filter === f.key ? "bg-[#C8102E] text-white" : "text-gray-500 hover:bg-gray-100")}>
              {f.label}
              <span className={cn("rounded-full px-1 text-[9px] font-bold",
                filter === f.key ? "bg-white/25 text-white" : "bg-gray-100 text-gray-400")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {[1,2,3,4].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3 animate-pulse">
                <div className="h-10 w-10 shrink-0 rounded-2xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded bg-gray-100" />
                  <div className="h-2.5 w-20 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-gray-300">
                <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-400">No leads here yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filtered.map((lead) => {
              const av = avatarFor(lead.id);
              const sc = STATUS[lead.status];
              const isSelected = lead.id === selectedId;
              return (
                <button key={lead.id} onClick={() => onSelect(lead.id)}
                  className={cn("w-full rounded-2xl p-3 text-left transition-all",
                    isSelected
                      ? "bg-gradient-to-r from-[#C8102E]/8 to-[#C8102E]/3 ring-1 ring-[#C8102E]/15"
                      : "hover:bg-gray-50"
                  )}>
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold"
                        style={{ background: av.bg, color: av.text }}>
                        {initials(lead.name)}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
                        style={{ background: sc.dot }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-sm font-semibold text-gray-900">{lead.name}</span>
                        <span className="shrink-0 text-[10px] text-gray-400">{relativeTime(lead.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">{lead.property_name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          {sc.label}
                        </span>
                        {lead.ai_score != null && (
                          <span className={cn("text-[10px] font-bold tabular-nums",
                            lead.ai_score >= 7 ? "text-emerald-600" : lead.ai_score >= 4 ? "text-amber-600" : "text-red-500")}>
                            {lead.ai_score}/10
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Center — Conversation
// ─────────────────────────────────────────────────────────────────────────────

function ConversationPanel({ lead, messages, messagesLoading, replyText, sending, onReplyChange, onSend }: {
  lead: Lead; messages: Message[]; messagesLoading: boolean;
  replyText: string; sending: boolean;
  onReplyChange: (t: string) => void; onSend: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const av = avatarFor(lead.id);
  const sc = STATUS[lead.status];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, lead.id]);

  const grouped: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const date = msgDate(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last?.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50/50">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold"
              style={{ background: av.bg, color: av.text }}>
              {initials(lead.name)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
              style={{ background: sc.dot }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{lead.name}</span>
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                {sc.label}
              </span>
            </div>
            <p className="text-xs text-gray-400">{lead.phone} · {lead.property_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.ai_score != null && (
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5">
              <span className="text-xs text-gray-400">AI Score</span>
              <span className={cn("text-sm font-bold tabular-nums",
                lead.ai_score >= 7 ? "text-emerald-600" : lead.ai_score >= 4 ? "text-amber-600" : "text-red-500")}>
                {lead.ai_score}/10
              </span>
            </div>
          )}
          <button className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            View Profile
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-2xl">
          {messagesLoading ? (
            <div className="space-y-4">
              {[1,2,3].map((i) => (
                <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                  <div className="h-14 w-56 animate-pulse rounded-2xl bg-gray-200" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm border border-gray-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-gray-300">
                  <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-400">No messages yet</p>
              <p className="mt-1 text-xs text-gray-300">Start the conversation below</p>
            </div>
          ) : (
            <div className="space-y-1">
              {grouped.map(({ date, msgs }) => (
                <div key={date}>
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[10px] font-semibold text-gray-400">{date}</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  <div className="space-y-3">
                    {msgs.map((msg) => {
                      const isOut = msg.direction === "outbound";
                      return (
                        <div key={msg.id} className={cn("flex gap-2", isOut ? "flex-row-reverse" : "flex-row")}>
                          {!isOut && (
                            <div className="flex h-7 w-7 shrink-0 self-end items-center justify-center rounded-full text-[10px] font-bold"
                              style={{ background: av.bg, color: av.text }}>
                              {initials(lead.name)[0]}
                            </div>
                          )}
                          <div className={cn("flex max-w-[70%] flex-col", isOut ? "items-end" : "items-start")}>
                            <div className={cn("rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                              isOut ? "rounded-tr-sm bg-gray-900 text-white" : "rounded-tl-sm border border-gray-100 bg-white text-gray-800")}>
                              {msg.body}
                            </div>
                            <div className={cn("mt-1 flex items-center gap-1.5", isOut ? "flex-row-reverse" : "flex-row")}>
                              <span className="text-[10px] text-gray-400">{msgTime(msg.created_at)}</span>
                              {isOut && msg.ai_generated && (
                                <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-600 border border-violet-100">AI</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>

      {/* Reply */}
      <div className="shrink-0 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-50 px-4 py-2 scrollbar-hide">
          {["Schedule Tour", "Send Application", "Follow Up", "Mark Won"].map((label) => (
            <button key={label} className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors">
              {label}
            </button>
          ))}
          <button className="ml-auto shrink-0 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-100 transition-colors">
            Mark Lost
          </button>
        </div>
        <div className="px-4 pb-4 pt-3">
          <textarea value={replyText} onChange={(e) => onReplyChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend(); }}
            placeholder="Type a reply… (⌘ + Enter to send)"
            rows={3}
            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none transition-all" />
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">{replyText.length} chars</span>
            <button onClick={onSend} disabled={!replyText.trim() || sending}
              className={cn("rounded-xl px-5 py-2 text-sm font-bold transition-all",
                replyText.trim() && !sending
                  ? "bg-[#C8102E] text-white hover:bg-[#A50D25]"
                  : "cursor-not-allowed bg-gray-100 text-gray-400"
              )}
              style={replyText.trim() && !sending ? { boxShadow: "0 4px 16px rgba(200,16,46,0.25)" } : {}}>
              {sending ? "Sending…" : "Send SMS →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Right — Lead detail (like image 2's profile card)
// ─────────────────────────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-right text-xs font-semibold text-gray-700">{value ?? "—"}</span>
    </div>
  );
}

function DetailPanel({ lead }: { lead: Lead }) {
  const av = avatarFor(lead.id);
  const sc = STATUS[lead.status];
  const theme = cardThemeFor(lead.id);

  return (
    <div className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-l border-gray-100 bg-white">
      {/* Profile card — gradient header like image 2 */}
      <div className="relative overflow-hidden px-5 pb-5 pt-6"
        style={{ background: `linear-gradient(135deg, ${theme.bg}22 0%, ${theme.bg}10 100%)` }}>
        <div className="flex flex-col items-center text-center">
          {/* Large avatar */}
          <div className="relative mb-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl text-xl font-bold shadow-lg"
              style={{ background: av.bg, color: av.text, boxShadow: `0 8px 24px ${av.bg}` }}>
              {initials(lead.name)}
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white"
              style={{ background: sc.dot }} />
          </div>

          <h3 className="text-base font-bold text-gray-900">{lead.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{lead.property_name}</p>

          <span className="mt-2 rounded-full px-3 py-1 text-[10px] font-bold"
            style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
            {sc.label}
          </span>

          {/* Action buttons — like image 2's icon row */}
          <div className="mt-4 flex items-center gap-2">
            {[
              { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", label: "Email" },
              { icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z", label: "Call" },
              { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", label: "Schedule" },
            ].map(({ icon, label }) => (
              <button key={label} title={label}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                  <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Score */}
      {lead.ai_score != null && (
        <div className="mx-4 my-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">AI Lead Score</span>
            <span className={cn("text-lg font-black tabular-nums",
              lead.ai_score >= 7 ? "text-emerald-600" : lead.ai_score >= 4 ? "text-amber-600" : "text-red-500")}>
              {lead.ai_score}<span className="text-xs font-semibold text-gray-400">/10</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${lead.ai_score * 10}%`,
                background: lead.ai_score >= 7 ? "#10B981" : lead.ai_score >= 4 ? "#F59E0B" : "#EF4444"
              }} />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">
            {lead.ai_summary ?? (lead.ai_score >= 7 ? "High intent — prioritize this lead" : lead.ai_score >= 4 ? "Moderate interest" : "Low engagement")}
          </p>
        </div>
      )}

      {/* Detailed info — like image 2's "Detailed Information" section */}
      <div className="px-4 pb-2">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Contact</p>
        <DetailField label="Phone" value={<a href={`tel:${lead.phone}`} className="text-[#C8102E] hover:underline font-mono text-[11px]">{lead.phone}</a>} />
        <DetailField label="Email" value={lead.email ? <a href={`mailto:${lead.email}`} className="text-[#C8102E] hover:underline">{lead.email}</a> : "—"} />
        <DetailField label="Prefers" value={<span className="capitalize">{lead.preferred_contact}</span>} />
        <DetailField label="Source" value={lead.source} />
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Qualification</p>
        <DetailField label="Move-in" value={lead.move_in_date ? new Date(lead.move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
        <DetailField label="Unit" value={lead.bedrooms != null ? (lead.bedrooms === 0 ? "Studio" : `${lead.bedrooms} Bedroom`) : "—"} />
        <DetailField label="Budget" value={formatBudget(lead.budget_min, lead.budget_max)} />
        <DetailField label="Pets" value={lead.pets === true ? "Yes 🐾" : lead.pets === false ? "No" : "—"} />
      </div>

      {/* Notes */}
      <div className="border-t border-gray-100 flex-1 p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Notes</p>
        <textarea defaultValue={lead.notes ?? ""} placeholder="Add a private note…" rows={3}
          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-700 placeholder-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none transition-all" />
        <button className="mt-2 w-full rounded-xl bg-gray-100 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
          Save Note
        </button>
      </div>

      {/* Danger */}
      <div className="border-t border-gray-100 p-4 space-y-1.5">
        <button className="w-full rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-400 hover:bg-gray-50 transition-colors">
          Unsubscribe Lead
        </button>
        <button className="w-full rounded-xl border border-red-100 bg-red-50 py-2 text-xs font-semibold text-red-400 hover:bg-red-100 transition-colors">
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
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [properties, setProperties]     = useState<Property[]>([]);
  const [selectedId, setSelectedId]     = useState<string>("");
  const [filter, setFilter]             = useState<FilterKey>("all");
  const [search, setSearch]             = useState("");
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [msgLoading, setMsgLoading]     = useState(false);
  const [replyText, setReplyText]       = useState("");
  const [sending, setSending]           = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadLeads = useCallback(async (props: Property[]) => {
    const allLeads: Lead[] = [];
    await Promise.all(props.map(async (p) => {
      const res = await fetch(`/api/leads?propertyId=${p.id}`);
      const json = await res.json();
      const rows = (json.leads ?? []) as Lead[];
      rows.forEach((l) => { l.property_name = p.name; l.property_phone = p.phone_number; });
      allLeads.push(...rows);
    }));
    allLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return allLeads;
  }, []);

  useEffect(() => {
    async function init() {
      setLeadsLoading(true);
      try {
        const { data: { user } } = await getSupabase().auth.getUser();
        if (!user?.email) return;
        const propRes = await fetch(`/api/properties?email=${encodeURIComponent(user.email)}`);
        const propJson = await propRes.json();
        const props: Property[] = propJson.properties ?? [];
        setProperties(props);
        const all = await loadLeads(props);
        setLeads(all);
        if (all.length) setSelectedId(all[0].id);
      } finally { setLeadsLoading(false); }
    }
    init();
  }, [loadLeads]);

  useEffect(() => {
    if (!selectedId) return;
    setMsgLoading(true);
    setMessages([]);
    fetch(`/api/conversations?leadId=${selectedId}`)
      .then((r) => r.json())
      .then((j) => setMessages(j.messages ?? []))
      .finally(() => setMsgLoading(false));
  }, [selectedId]);

  const handleSend = useCallback(async () => {
    if (!replyText.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      await fetch("/api/sms/outbound", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead_id: selectedId, message: replyText.trim() }) });
      setReplyText("");
      const res = await fetch(`/api/conversations?leadId=${selectedId}`);
      setMessages((await res.json()).messages ?? []);
    } finally { setSending(false); }
  }, [replyText, selectedId, sending]);

  const handleAdded = useCallback(async () => {
    const all = await loadLeads(properties);
    setLeads(all);
    if (all.length && !selectedId) setSelectedId(all[0].id);
  }, [properties, selectedId, loadLeads]);

  const [mobileView, setMobileView] = useState<"list" | "conversation">("list");

  const selectedLead = leads.find((l) => l.id === selectedId);
  const hotLeads = leads.filter((l) => (l.ai_score ?? 0) >= 7 || l.status === "tour_scheduled").slice(0, 5);

  // Stats
  const newCount   = leads.filter((l) => l.status === "new").length;
  const tourCount  = leads.filter((l) => l.status === "tour_scheduled").length;
  const wonCount   = leads.filter((l) => l.status === "won").length;

  function handleSelectLead(id: string) {
    setSelectedId(id);
    setMobileView("conversation");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 40%, #fdf8ff 100%)" }}>

      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />}

      {/* Stats bar — scrollable on mobile */}
      <div className="shrink-0 border-b border-white/80 bg-white/70 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide sm:gap-8">
            <StatChip label="Total" value={leads.length.toString()} color="#6366F1" />
            <div className="h-6 w-px shrink-0 bg-gray-100 sm:h-8" />
            <StatChip label="New" value={newCount.toString()} sub={newCount > 0 ? "needs reply" : ""} color="#3B82F6" />
            <div className="h-6 w-px shrink-0 bg-gray-100 sm:h-8" />
            <StatChip label="Tours" value={tourCount.toString()} color="#F59E0B" />
            <div className="h-6 w-px shrink-0 bg-gray-100 sm:h-8" />
            <StatChip label="Won" value={wonCount.toString()} color="#10B981" />
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="shrink-0 flex items-center gap-1.5 rounded-2xl bg-[#C8102E] px-3 py-2 text-xs font-bold text-white hover:bg-[#A50D25] transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
            style={{ boxShadow: "0 6px 20px rgba(200,16,46,0.3)" }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
              <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
            </svg>
            <span className="hidden sm:inline">Add Lead</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {hotLeads.length > 0 && (
          <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {hotLeads.map((lead) => (
              <HotLeadCard key={lead.id} lead={lead} onClick={() => handleSelectLead(lead.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile: list or conversation view */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — full width on mobile when showing list */}
        <div className={cn(
          "flex-col border-r border-gray-100 bg-white",
          "sm:flex sm:w-[280px] sm:shrink-0",
          mobileView === "list" ? "flex w-full" : "hidden"
        )}>
          <LeftPanel
            leads={leads} selectedId={selectedId} filter={filter} search={search} loading={leadsLoading}
            onSelect={handleSelectLead} onFilterChange={setFilter} onSearchChange={setSearch}
            onAddLead={() => setShowAddModal(true)}
          />
        </div>

        {/* Conversation + detail — full width on mobile when showing conversation */}
        {selectedLead ? (
          <div className={cn(
            "flex-1 flex flex-col overflow-hidden",
            mobileView === "conversation" ? "flex" : "hidden sm:flex"
          )}>
            {/* Mobile back button */}
            <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-2 sm:hidden">
              <button onClick={() => setMobileView("list")}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#C8102E]">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to leads
              </button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <ConversationPanel
                lead={selectedLead} messages={messages} messagesLoading={msgLoading}
                replyText={replyText} sending={sending}
                onReplyChange={setReplyText} onSend={handleSend}
              />
              <div className="hidden xl:flex">
                <DetailPanel lead={selectedLead} />
              </div>
            </div>
          </div>
        ) : !leadsLoading && (
          <div className={cn("flex-1 flex-col items-center justify-center gap-4", mobileView === "list" ? "hidden sm:flex" : "flex")}>
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm border border-gray-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} className="h-10 w-10 text-gray-300">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-400">No leads yet</p>
            <button onClick={() => setShowAddModal(true)}
              className="rounded-2xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
              style={{ boxShadow: "0 6px 20px rgba(200,16,46,0.25)" }}>
              Add First Lead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
