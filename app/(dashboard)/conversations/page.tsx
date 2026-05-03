"use client";

// /conversations — dedicated SMS conversations workspace.
// Lists all leads with their most recent message + timestamp, sorted by activity.
// Click a lead to open the full thread in /leads/[id] (the existing detail view).

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch, getOperatorEmail } from "@/lib/demo-auth";

type LeadStatus = "new" | "contacted" | "engaged" | "tour_scheduled" | "applied" | "won" | "lost";

interface Lead {
  id: string;
  name: string;
  status: LeadStatus;
  property_id?: string;
  property_name?: string;
  created_at: string;
  last_contacted_at?: string;
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function avatarGradient(id: string): string {
  const palette = [
    "linear-gradient(135deg, #C8102E, #A50D25)",
    "linear-gradient(135deg, #A78BFA, #7C5BE6)",
    "linear-gradient(135deg, #F59E0B, #D97706)",
    "linear-gradient(135deg, #F87171, #C8102E)",
  ];
  return palette[id.charCodeAt(0) % palette.length];
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function ConversationsPage() {
  const router = useRouter();
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter]     = useState<LeadStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const email = await getOperatorEmail();
      if (!email) { router.push("/setup"); return; }

      const propRes = await authFetch("/api/properties");
      const propJson = await propRes.json();
      const props: Property[] = propJson.properties ?? [];
      setProperties(props);

      const allLeads: Lead[] = [];
      await Promise.all(props.map(async (p) => {
        const r = await authFetch(`/api/leads?propertyId=${p.id}`);
        const j = await r.json();
        const rows = (j.leads ?? []) as Lead[];
        rows.forEach((l) => { l.property_name = p.name; });
        allLeads.push(...rows);
      }));

      allLeads.sort((a, b) => {
        const ta = new Date(a.last_contacted_at ?? a.created_at).getTime();
        const tb = new Date(b.last_contacted_at ?? b.created_at).getTime();
        return tb - ta;
      });
      setLeads(allLeads);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Apply filters
  const filtered = leads.filter((l) => {
    if (propertyFilter !== "all" && l.property_id !== propertyFilter) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (search.trim() && !l.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5 p-4 lg:p-6">

      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Conversations</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Every AI-powered SMS thread across your portfolio in one place.
        </p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          {loading ? "Loading…" : `${leads.length} total · ${filtered.length} shown`}
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <circle cx="7" cy="7" r="5" /><line x1="14" y1="14" x2="10.5" y2="10.5" />
          </svg>
          <input
            type="text"
            placeholder="Search by lead name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#C8102E]/40 focus:outline-none dark:border-[#1E1E2E] dark:bg-[#10101A] dark:text-white dark:placeholder:text-gray-600"
          />
        </div>
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-[#C8102E]/40 focus:outline-none dark:border-[#1E1E2E] dark:bg-[#10101A] dark:text-gray-300"
        >
          <option value="all">All properties</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-[#C8102E]/40 focus:outline-none dark:border-[#1E1E2E] dark:bg-[#10101A] dark:text-gray-300"
        >
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {/* Conversation list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-white/10">
          <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
            {leads.length === 0 ? "No conversations yet" : "No conversations match your filters"}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {leads.length === 0
              ? "Conversations appear here automatically as leads arrive and the AI replies."
              : "Try removing a filter or clearing the search."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#C8102E]/40 hover:shadow-[0_0_24px_rgba(200,16,46,0.15)] dark:border-[#1E1E2E] dark:bg-[#10101A]"
            >
              {/* Avatar */}
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: avatarGradient(lead.id) }}
              >
                {initials(lead.name)}
              </div>

              {/* Lead info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{lead.name}</p>
                  <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                    {relativeTime(lead.last_contacted_at ?? lead.created_at)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[lead.status]}`} />
                    {STATUS_LABEL[lead.status]}
                  </span>
                  <span className="text-gray-300 dark:text-gray-700">·</span>
                  <span className="truncate text-gray-500 dark:text-gray-500">{lead.property_name ?? "—"}</span>
                </div>
              </div>

              {/* Open icon */}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-[#C8102E] dark:text-gray-700">
                <polyline points="6 3 11 8 6 13" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
