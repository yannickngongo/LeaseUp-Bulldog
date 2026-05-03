"use client";

// /leads — simple roster: every lead across the operator's portfolio.
// Filter by property or view all; click a lead to open the detail page.

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authFetch, getOperatorEmail } from "@/lib/demo-auth";

type LeadStatus = "new" | "contacted" | "engaged" | "tour_scheduled" | "applied" | "won" | "lost";

interface Lead {
  id: string;
  name: string;
  phone: string;
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

  // Deep-link support: legacy /leads?property=X&lead=Y → jump straight to detail
  useEffect(() => {
    const leadId = searchParams.get("lead");
    if (leadId) router.replace(`/leads/${leadId}`);
  }, [searchParams, router]);

  const filtered = leads.filter((l) => {
    if (propertyFilter !== "all" && l.property_id !== propertyFilter) return false;
    if (search.trim() && !l.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* Hero */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Leads</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Everyone in your pipeline, across every property.
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {loading ? "Loading…" : `${leads.length} total · ${filtered.length} shown`}
          </p>
        </div>
        <Link
          href="/leads/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#C8102E] px-4 py-2 text-sm font-bold text-white shadow-[0_6px_20px_rgba(200,16,46,0.25)] transition-colors hover:bg-[#A50D25]"
        >
          <span className="text-lg leading-none">+</span> Add Lead
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-md flex-1">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <circle cx="7" cy="7" r="5" /><line x1="14" y1="14" x2="10.5" y2="10.5" />
          </svg>
          <input
            type="text"
            placeholder="Search by name…"
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
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-white/10">
          <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
            {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {leads.length === 0
              ? "When a prospect texts your property number or fills out a webform, they show up here."
              : "Try changing the property filter or clearing the search."}
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
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: avatarGradient(lead.id) }}
              >
                {initials(lead.name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{lead.name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[lead.status]}`} />
                    {STATUS_LABEL[lead.status]}
                  </span>
                  <span className="text-gray-300 dark:text-gray-700">·</span>
                  <span className="truncate text-gray-500 dark:text-gray-500">{lead.property_name ?? "—"}</span>
                </div>
              </div>

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

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsInner />
    </Suspense>
  );
}
