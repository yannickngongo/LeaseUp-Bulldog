"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOperatorEmail, authFetch } from "@/lib/demo-auth";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
  phone_number: string;
  active_special?: string;
  website_url?: string;
  total_units?: number | null;
  occupied_units?: number | null;
}

interface PropertyWithStats extends Property {
  leadCount: number;
  tourCount: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className ?? ""}`} />;
}

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyWithStats[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const email = await getOperatorEmail();
        if (!email) { router.push("/setup"); return; }

        const propRes = await authFetch(`/api/properties`);
        const propJson = await propRes.json();
        const props: Property[] = propJson.properties ?? [];

        // Load lead counts for each property
        const withStats = await Promise.all(props.map(async (p) => {
          const res = await fetch(`/api/leads?propertyId=${p.id}`);
          const json = await res.json();
          const leads = json.leads ?? [];
          return {
            ...p,
            leadCount: leads.filter((l: { status: string }) => !["won","lost"].includes(l.status)).length,
            tourCount: leads.filter((l: { status: string }) => l.status === "tour_scheduled").length,
          };
        }));

        setProperties(withStats);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  return (
    <div className="p-4 lg:p-6">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Properties</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">
            {loading ? "Loading…" : `${properties.length} ${properties.length === 1 ? "property" : "properties"}`}
          </p>
        </div>
        <Link href="/properties/new"
          className="flex items-center gap-2 rounded-xl bg-[#C8102E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
          style={{ boxShadow: "0 4px 16px rgba(200,16,46,0.25)" }}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
          </svg>
          Add Property
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <Skeleton className="mb-3 h-5 w-36" />
              <Skeleton className="mb-2 h-3.5 w-48" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && properties.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center dark:border-white/10">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#C8102E]/8">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth={1.5} className="h-8 w-8">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">No properties yet</h3>
          <p className="mb-5 text-sm text-gray-400">Add your first property to start managing leads with AI.</p>
          <Link href="/properties/new"
            className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
            style={{ boxShadow: "0 6px 20px rgba(200,16,46,0.25)" }}>
            Add First Property →
          </Link>
        </div>
      )}

      {/* Property cards */}
      {!loading && properties.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <div key={p.id}
              className="group relative rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.09)] dark:border-white/5 dark:bg-[#1C1F2E]">

              {/* Clickable overlay — opens property dashboard */}
              <Link href={`/properties/${p.id}`} className="absolute inset-0 z-0 rounded-2xl" aria-label={`View ${p.name} dashboard`} />

              {/* Header */}
              <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C8102E]/10">
                  <svg viewBox="0 0 20 20" fill="#C8102E" className="h-5 w-5">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </div>
                {p.active_special && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                    Special active
                  </span>
                )}
              </div>

              {/* Name + address */}
              <h3 className="relative z-10 mb-0.5 font-bold text-gray-900 dark:text-gray-100">{p.name}</h3>
              <p className="relative z-10 text-xs text-gray-400 dark:text-gray-500">{p.address}, {p.city}, {p.state} {p.zip}</p>
              {p.neighborhood && (
                <p className="relative z-10 mt-0.5 text-xs text-gray-400 dark:text-gray-500">📍 {p.neighborhood}</p>
              )}

              {/* Special */}
              {p.active_special && (
                <p className="relative z-10 mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                  🎁 {p.active_special}
                </p>
              )}

              {/* Stats */}
              <div className={`relative z-10 mt-4 grid gap-3 border-t border-gray-50 pt-4 dark:border-white/5 ${p.total_units ? "grid-cols-3" : "grid-cols-2"}`}>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Active Leads</p>
                  <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-gray-100">{p.leadCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Tours Booked</p>
                  <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-gray-100">{p.tourCount}</p>
                </div>
                {p.total_units ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Occupancy</p>
                    <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-gray-100">
                      {p.occupied_units != null
                        ? `${Math.round((p.occupied_units / p.total_units) * 100)}%`
                        : "—"}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {p.occupied_units ?? "?"}/{p.total_units} units
                    </p>
                  </div>
                ) : null}
              </div>

              {/* AI number */}
              <div className="relative z-10 mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-gray-400">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{p.phone_number}</span>
                <span className="ml-auto text-[10px] font-semibold text-gray-400">AI line</span>
              </div>

              {/* Website */}
              {p.website_url && (
                <a href={p.website_url} target="_blank" rel="noopener noreferrer"
                  className="relative z-10 mt-2 flex items-center gap-1.5 text-xs text-[#C8102E] hover:underline">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
                    <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V9M10 1h5v5M7.5 8.5l7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {p.website_url.replace(/^https?:\/\//, "")}
                </a>
              )}

              {/* Actions */}
              <div className="relative z-10 mt-4 flex gap-2">
                <Link href={`/leads?propertyId=${p.id}`}
                  className="flex-1 rounded-xl border border-gray-200 py-2 text-center text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors dark:border-white/10 dark:text-gray-300">
                  View Leads
                </Link>
                <Link href={`/properties/${p.id}/edit`}
                  className="flex-1 rounded-xl border border-gray-200 py-2 text-center text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors dark:border-white/10 dark:text-gray-300">
                  Edit / Rent Roll
                </Link>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
                    const res = await fetch(`/api/properties/${p.id}`, { method: "DELETE" });
                    if (res.ok) setProperties(prev => prev.filter(x => x.id !== p.id));
                    else alert("Failed to delete property");
                  }}
                  className="rounded-xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors dark:border-red-900/20 dark:hover:bg-red-900/10">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
