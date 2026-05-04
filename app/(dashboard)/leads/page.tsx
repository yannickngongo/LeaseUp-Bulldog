"use client";

// /leads — Kanban-style pipeline board (CRM reference: crmboard.com).
// Each column is a lead status; cards show lead summary; click → /leads/[id].
// Toggle between Kanban and List views; filter by property; add new lead.

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authFetch, getOperatorEmail } from "@/lib/demo-auth";

type LeadStatus = "new" | "contacted" | "engaged" | "tour_scheduled" | "applied" | "won" | "lost";
type ViewMode = "kanban" | "list";

interface Lead {
  id: string;
  name: string;
  status: LeadStatus;
  phone?: string;
  property_id?: string;
  property_name?: string;
  source?: string;
  ai_summary?: string;
  ai_score?: number;
  move_in_date?: string;
  budget_min?: number;
  budget_max?: number;
  bedrooms?: number;
  created_at: string;
  last_contacted_at?: string;
}

interface Property {
  id: string;
  name: string;
}

const COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: "new",            label: "New" },
  { status: "contacted",      label: "Contacted" },
  { status: "engaged",        label: "Engaged" },
  { status: "tour_scheduled", label: "Tour Booked" },
  { status: "applied",        label: "Applied" },
  { status: "won",            label: "Won" },
];

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
  tour_scheduled: "Tour Booked", applied: "Applied", won: "Won", lost: "Lost",
};

function relativeDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function avatarGradient(id: string): string {
  const palette = [
    "linear-gradient(135deg, #C8102E, #A50D25)",
    "linear-gradient(135deg, #A78BFA, #7C5BE6)",
    "linear-gradient(135deg, #F59E0B, #D97706)",
    "linear-gradient(135deg, #F87171, #C8102E)",
    "linear-gradient(135deg, #34D399, #059669)",
    "linear-gradient(135deg, #60A5FA, #2563EB)",
  ];
  return palette[id.charCodeAt(0) % palette.length];
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("") || "?";
}

function LeadsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads]           = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>(
    searchParams.get("property") ?? "all"
  );
  const [view, setView] = useState<ViewMode>(
    (searchParams.get("view") as ViewMode) ?? "kanban"
  );

  const load = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Legacy deep-link: /leads?lead=ID → /leads/ID
  useEffect(() => {
    const leadId = searchParams.get("lead");
    if (leadId) router.replace(`/leads/${leadId}`);
  }, [searchParams, router]);

  // Sync view + property filter to URL (keep state across refresh)
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    if (propertyFilter !== "all") url.searchParams.set("property", propertyFilter);
    else url.searchParams.delete("property");
    window.history.replaceState({}, "", url.toString());
  }, [view, propertyFilter]);

  const filtered = leads.filter((l) => {
    if (propertyFilter !== "all" && l.property_id !== propertyFilter) return false;
    if (search.trim() && !l.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  // Group by column status (Won / Lost still get included, Lost is hidden by default)
  const byStatus = useMemo(() => {
    const grouped: Record<LeadStatus, Lead[]> = {
      new: [], contacted: [], engaged: [], tour_scheduled: [], applied: [], won: [], lost: [],
    };
    filtered.forEach((l) => grouped[l.status]?.push(l));
    return grouped;
  }, [filtered]);

  // Top stats
  const totalLeads = filtered.length;
  const tourCount  = byStatus.tour_scheduled.length + byStatus.applied.length + byStatus.won.length;
  const wonCount   = byStatus.won.length;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-[#F5F6F8] dark:bg-[#0A0B11]">
      {/* ── Top breadcrumb / stats bar ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/70 bg-white px-6 py-3 dark:border-[#1E1E2E] dark:bg-[#10101A]">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Leads</h1>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-sm font-medium capitalize text-gray-500">{view === "kanban" ? "Kanban Board" : "List"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400">
              <circle cx="7" cy="7" r="5" /><line x1="14" y1="14" x2="10.5" y2="10.5" />
            </svg>
            <input
              type="text"
              placeholder="Search or ⌘K..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 rounded-lg border border-gray-200 bg-[#F4F6F8] py-1.5 pl-8 pr-3 text-xs text-gray-800 placeholder:text-gray-400 focus:border-[#C8102E]/40 focus:bg-white focus:outline-none dark:border-white/5 dark:bg-white/5 dark:text-gray-200 dark:placeholder:text-gray-600"
            />
          </div>
        </div>
      </div>

      {/* ── Sub-header: counts + view toggle + filter + add ────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/70 bg-white px-6 py-3 dark:border-[#1E1E2E] dark:bg-[#10101A]">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-500 dark:text-gray-500">Total:</span>{" "}
          <span className="font-bold text-gray-900 dark:text-white">{totalLeads} Leads</span>
          <span className="mx-2 text-gray-300 dark:text-gray-700">·</span>
          <span className="font-semibold text-gray-500 dark:text-gray-500">Tours:</span>{" "}
          <span className="font-bold text-gray-900 dark:text-white">{tourCount}</span>
          <span className="mx-2 text-gray-300 dark:text-gray-700">·</span>
          <span className="font-semibold text-gray-500 dark:text-gray-500">Won:</span>{" "}
          <span className="font-bold text-green-600 dark:text-green-500">{wonCount}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-white/5 dark:bg-white/5">
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                view === "kanban" ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              aria-label="Kanban view"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <rect x="2" y="2" width="5" height="12" rx="1" />
                <rect x="9" y="2" width="5" height="8" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                view === "list" ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              aria-label="List view"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <line x1="3" y1="4" x2="13" y2="4" /><line x1="3" y1="8" x2="13" y2="8" /><line x1="3" y1="12" x2="13" y2="12" />
              </svg>
            </button>
          </div>

          {/* Property filter */}
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-[#C8102E]/40 focus:outline-none dark:border-white/5 dark:bg-white/5 dark:text-gray-300"
          >
            <option value="all">All properties</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Add lead */}
          <Link
            href="/leads/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[10px] leading-none">+</span>
            Add lead
          </Link>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex gap-4 p-5">
            {[1,2,3,4].map((i) => (
              <div key={i} className="h-72 w-72 shrink-0 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
            ))}
          </div>
        ) : view === "kanban" ? (
          <KanbanBoard columns={COLUMNS} byStatus={byStatus} />
        ) : (
          <ListView leads={filtered} />
        )}
      </div>
    </div>
  );
}

// ─── Kanban Board ────────────────────────────────────────────────────────────
function KanbanBoard({
  columns, byStatus,
}: {
  columns: typeof COLUMNS;
  byStatus: Record<LeadStatus, Lead[]>;
}) {
  return (
    <div className="flex h-full gap-4 overflow-x-auto p-5">
      {columns.map((col) => (
        <KanbanColumn key={col.status} status={col.status} label={col.label} leads={byStatus[col.status] ?? []} />
      ))}
    </div>
  );
}

function KanbanColumn({
  status, label, leads,
}: {
  status: LeadStatus;
  label: string;
  leads: Lead[];
}) {
  const count = leads.length;

  return (
    <div className="flex w-72 shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-3 flex items-start justify-between px-1">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{label}</h3>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-gray-500">
            {count} {count === 1 ? "Lead" : "Leads"}
          </p>
        </div>
        <button
          type="button"
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5"
          aria-label="Column actions"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <circle cx="3" cy="8" r="1.25" /><circle cx="8" cy="8" r="1.25" /><circle cx="13" cy="8" r="1.25" />
          </svg>
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5">
        {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}

        {/* Add placeholder */}
        <Link
          href={`/leads/new?status=${status}`}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-gray-300 bg-white/50 py-2.5 text-[11px] font-semibold text-gray-400 transition-colors hover:border-[#C8102E]/40 hover:bg-white hover:text-[#C8102E] dark:border-white/10 dark:bg-white/5 dark:hover:border-[#C8102E]/40"
        >
          <span className="text-base leading-none">+</span> Add
        </Link>
      </div>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  // Description: AI summary if present, else qualification snippet
  const description = lead.ai_summary
    ? lead.ai_summary
    : [
        lead.move_in_date ? `Move-in ${lead.move_in_date}` : null,
        lead.bedrooms != null ? `${lead.bedrooms}BR` : null,
        lead.budget_min && lead.budget_max ? `$${lead.budget_min}–$${lead.budget_max}` : null,
        lead.source ? `via ${lead.source}` : null,
      ].filter(Boolean).join(" · ") || "Click to view conversation and details.";

  // Status icon (top-right of card)
  let statusIcon = null;
  if (lead.status === "won") {
    statusIcon = (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-green-600">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-2.5 w-2.5">
          <polyline points="2 6 5 9 10 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  } else if (lead.status === "lost") {
    statusIcon = (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-2.5 w-2.5">
          <line x1="3" y1="3" x2="9" y2="9" /><line x1="9" y1="3" x2="3" y2="9" />
        </svg>
      </span>
    );
  } else if (lead.status === "tour_scheduled") {
    statusIcon = (
      <span className="flex h-4 w-4 items-center justify-center text-amber-500">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3 w-3">
          <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
          <line x1="2.5" y1="6.5" x2="13.5" y2="6.5" />
        </svg>
      </span>
    );
  }

  return (
    <Link
      href={`/leads/${lead.id}`}
      className="group block rounded-2xl border border-gray-100 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#C8102E]/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:border-white/5 dark:bg-[#10101A] dark:hover:border-[#C8102E]/30"
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="truncate text-[13px] font-bold text-gray-900 dark:text-white">{lead.name}</h4>
        {statusIcon}
      </div>

      {/* Description */}
      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-500">
        {description}
      </p>

      {/* Meta row */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-500">
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
          style={{ background: avatarGradient(lead.id) }}
        >
          {initials(lead.name)}
        </div>
        <span className="truncate font-medium text-gray-700 dark:text-gray-300">{lead.property_name ?? "—"}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3 w-3">
            <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
            <line x1="2.5" y1="6.5" x2="13.5" y2="6.5" />
            <line x1="6" y1="2" x2="6" y2="5" /><line x1="10" y1="2" x2="10" y2="5" />
          </svg>
          {relativeDate(lead.last_contacted_at ?? lead.created_at)}
        </span>
      </div>
    </Link>
  );
}

// ─── List view (compact alternative) ─────────────────────────────────────────
function ListView({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <div className="m-5 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-white/10">
        <p className="text-base font-semibold text-gray-700 dark:text-gray-200">No leads match your filters</p>
        <p className="mt-1 text-sm text-gray-400">Try changing the property filter or clearing the search.</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 p-5">
      {leads.map((lead) => (
        <Link
          key={lead.id}
          href={`/leads/${lead.id}`}
          className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-[#C8102E]/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:border-white/5 dark:bg-[#10101A] dark:hover:border-[#C8102E]/30"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: avatarGradient(lead.id) }}
          >
            {initials(lead.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{lead.name}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[lead.status]}`} />
                {STATUS_LABEL[lead.status]}
              </span>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <span className="truncate text-gray-500">{lead.property_name ?? "—"}</span>
            </div>
          </div>
          <span className="shrink-0 text-[11px] text-gray-400">{relativeDate(lead.last_contacted_at ?? lead.created_at)}</span>
        </Link>
      ))}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsInner />
    </Suspense>
  );
}
