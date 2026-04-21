"use client";

import { useState, useEffect } from "react";
import { getOperatorEmail } from "@/lib/demo-auth";

interface TrackedCompetitor {
  id: string;
  name: string;
  property_name: string;
  property_id: string;
  city: string;
  state: string;
  our_avg_rent: number;
  their_rent_range: string;
  their_low: number;
  their_high: number;
  threat_level: "high" | "medium" | "low";
  key_amenities: string[];
  last_updated: string;
  alert: string | null;
}

interface Property {
  id: string;
  name: string;
  city: string;
  state: string;
  avg_rent?: number;
}

function threatColor(t: TrackedCompetitor["threat_level"]) {
  if (t === "high")   return { badge: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",     dot: "bg-red-500",    border: "border-red-200 dark:border-red-900/30" };
  if (t === "medium") return { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", dot: "bg-amber-500", border: "border-amber-100 dark:border-amber-900/20" };
  return              { badge: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",    dot: "bg-green-500",  border: "border-gray-100 dark:border-white/5" };
}

function pricePosition(ours: number, low: number, high: number): { label: string; color: string } {
  const mid = (low + high) / 2;
  if (ours < low)        return { label: "Priced Below Market", color: "text-blue-600 dark:text-blue-400" };
  if (ours > high)       return { label: "Priced Above Market", color: "text-red-600 dark:text-red-400" };
  if (ours < mid - 50)   return { label: "Competitive",          color: "text-green-600 dark:text-green-400" };
  if (ours > mid + 100)  return { label: "Slightly High",        color: "text-amber-600 dark:text-amber-400" };
  return                          { label: "Market Rate",          color: "text-green-600 dark:text-green-400" };
}

function CompetitorCard({ comp }: { comp: TrackedCompetitor }) {
  const tc = threatColor(comp.threat_level);
  const pos = pricePosition(comp.our_avg_rent, comp.their_low, comp.their_high);
  const diff = comp.our_avg_rent - Math.round((comp.their_low + comp.their_high) / 2);

  return (
    <div className={`rounded-2xl border bg-white dark:bg-[#1C1F2E] p-5 shadow-sm ${comp.alert ? tc.border : "border-gray-100 dark:border-white/5"}`}>
      {comp.alert && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 px-3 py-2">
          <span className="text-red-500 shrink-0 text-xs mt-0.5">⚠</span>
          <p className="text-xs text-red-700 dark:text-red-400">{comp.alert}</p>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{comp.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{comp.property_name} · {comp.city}, {comp.state}</p>
        </div>
        <span className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold ${tc.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tc.dot}`} />
          {comp.threat_level.charAt(0).toUpperCase() + comp.threat_level.slice(1)} Threat
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-2.5 text-center">
          <p className="text-sm font-black text-gray-800 dark:text-gray-100">${comp.our_avg_rent.toLocaleString()}</p>
          <p className="text-[9px] text-gray-400">Our avg. rent</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-2.5 text-center">
          <p className="text-sm font-black text-gray-800 dark:text-gray-100">{comp.their_rent_range}</p>
          <p className="text-[9px] text-gray-400">Their range</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-2.5 text-center">
          <p className={`text-sm font-black ${diff > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
            {diff > 0 ? "+" : ""}{diff > 0 ? `$${diff}` : `-$${Math.abs(diff)}`}
          </p>
          <p className="text-[9px] text-gray-400">vs. their mid</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold ${pos.color}`}>{pos.label}</span>
        <span className="text-[10px] text-gray-400">Updated {comp.last_updated}</span>
      </div>

      {comp.key_amenities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {comp.key_amenities.map(a => (
            <span key={a} className="rounded-full border border-gray-200 dark:border-white/10 px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">{a}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function AddCompetitorModal({ properties, onClose, onAdd }: {
  properties: Property[];
  onClose: () => void;
  onAdd: (comp: Omit<TrackedCompetitor, "id" | "last_updated" | "alert">) => void;
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [name, setName]             = useState("");
  const [rentLow, setRentLow]       = useState("");
  const [rentHigh, setRentHigh]     = useState("");
  const [threat, setThreat]         = useState<TrackedCompetitor["threat_level"]>("medium");
  const [amenities, setAmenities]   = useState("");

  const property = properties.find(p => p.id === propertyId);

  function handleAdd() {
    if (!name.trim() || !rentLow || !rentHigh || !property) return;
    const low = parseInt(rentLow), high = parseInt(rentHigh);
    onAdd({
      name: name.trim(),
      property_name: property.name,
      property_id: propertyId,
      city: property.city,
      state: property.state,
      our_avg_rent: property.avg_rent ?? 1200,
      their_rent_range: `$${low.toLocaleString()}–$${high.toLocaleString()}`,
      their_low: low,
      their_high: high,
      threat_level: threat,
      key_amenities: amenities.split(",").map(a => a.trim()).filter(Boolean),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1C1F2E] border border-gray-100 dark:border-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-5 py-4">
          <p className="font-bold text-gray-900 dark:text-gray-100">Track Competitor</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Your Property</label>
            <select value={propertyId} onChange={e => setPropertyId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-[#C8102E]">
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Competitor Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="The Reserve at Oak Park"
              className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Their Rent Low ($)</label>
              <input type="number" value={rentLow} onChange={e => setRentLow(e.target.value)} placeholder="1100"
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Their Rent High ($)</label>
              <input type="number" value={rentHigh} onChange={e => setRentHigh(e.target.value)} placeholder="1800"
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Threat Level</label>
            <div className="flex gap-2">
              {(["high","medium","low"] as const).map(t => (
                <button key={t} onClick={() => setThreat(t)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-bold capitalize transition-colors ${threat === t ? "border-[#C8102E] bg-[#C8102E]/10 text-[#C8102E]" : "border-gray-200 dark:border-white/10 text-gray-500"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Key Amenities (comma-separated)</label>
            <input value={amenities} onChange={e => setAmenities(e.target.value)} placeholder="Pool, Gym, Covered Parking"
              className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300">Cancel</button>
            <button onClick={handleAdd} disabled={!name.trim() || !rentLow || !rentHigh}
              className="flex-1 rounded-lg bg-[#C8102E] py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40">
              Add Competitor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<TrackedCompetitor[]>([]);
  const [properties, setProperties]   = useState<Property[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [filter, setFilter]           = useState<"all" | "high" | "medium" | "low" | "alerts">("all");
  const [syncing, setSyncing]         = useState(false);

  useEffect(() => {
    getOperatorEmail().then(email => {
      if (!email) { setLoading(false); return; }
      fetch(`/api/setup?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(async d => {
          const opId = d.operator?.id;
          if (!opId) { setLoading(false); return; }
          const propsRes = await fetch(`/api/properties?operator_id=${opId}`);
          const propsData = await propsRes.json();
          const props: Property[] = (propsData.properties ?? []).map((p: { id: string; name: string; city: string; state: string; avg_rent?: number }) => ({
            id: p.id, name: p.name, city: p.city ?? "", state: p.state ?? "", avg_rent: p.avg_rent ?? 1200,
          }));
          setProperties(props);

          // Seed demo competitors if no real ones
          const seed: TrackedCompetitor[] = props.slice(0, 2).flatMap((p, pi) => [
            {
              id:              `seed-${pi}-1`,
              name:            pi === 0 ? "The Reserve at Midtown" : "Parkview Apartments",
              property_name:   p.name,
              property_id:     p.id,
              city:            p.city,
              state:           p.state,
              our_avg_rent:    p.avg_rent ?? 1200,
              their_rent_range: `$${(p.avg_rent ?? 1200) - 100}–$${(p.avg_rent ?? 1200) + 200}`,
              their_low:       (p.avg_rent ?? 1200) - 100,
              their_high:      (p.avg_rent ?? 1200) + 200,
              threat_level:    "high" as const,
              key_amenities:   ["Pool", "Gym", "Dog Park"],
              last_updated:    "2 days ago",
              alert:           "They dropped rent by $75 this week. You may be overpriced.",
            },
            {
              id:              `seed-${pi}-2`,
              name:            pi === 0 ? "Oak Creek Flats" : "Sunrise Commons",
              property_name:   p.name,
              property_id:     p.id,
              city:            p.city,
              state:           p.state,
              our_avg_rent:    p.avg_rent ?? 1200,
              their_rent_range: `$${(p.avg_rent ?? 1200) + 50}–$${(p.avg_rent ?? 1200) + 300}`,
              their_low:       (p.avg_rent ?? 1200) + 50,
              their_high:      (p.avg_rent ?? 1200) + 300,
              threat_level:    "medium" as const,
              key_amenities:   ["Rooftop Deck", "Co-working Space"],
              last_updated:    "5 days ago",
              alert:           null,
            },
          ]);
          if (props.length > 0) setCompetitors(seed);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  function handleAdd(comp: Omit<TrackedCompetitor, "id" | "last_updated" | "alert">) {
    const newComp: TrackedCompetitor = {
      ...comp,
      id:           `local-${Date.now()}`,
      last_updated: "Just now",
      alert:        null,
    };
    setCompetitors(prev => [newComp, ...prev]);
  }

  async function syncAll() {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 2000));
    setCompetitors(prev => prev.map(c => ({ ...c, last_updated: "Just now" })));
    setSyncing(false);
  }

  const filtered = competitors.filter(c => {
    if (filter === "alerts") return c.alert != null;
    if (filter === "all") return true;
    return c.threat_level === filter;
  });

  const alerts = competitors.filter(c => c.alert != null).length;
  const highThreats = competitors.filter(c => c.threat_level === "high").length;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0E1017]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Competitor Tracking</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Monitor competitor rents and get alerted when you're priced wrong</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={syncAll} disabled={syncing}
              className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 transition-colors">
              {syncing ? <><span className="h-3 w-3 animate-spin rounded-full border border-gray-400/30 border-t-gray-500" />Syncing…</> : "↻ Sync All"}
            </button>
            <button onClick={() => setShowAdd(true)} disabled={properties.length === 0}
              className="flex items-center gap-2 rounded-xl bg-[#C8102E] px-4 py-2 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
              + Track Competitor
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4 text-center">
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{competitors.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Tracked</p>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-4 text-center">
            <p className="text-2xl font-black text-red-600 dark:text-red-400">{alerts}</p>
            <p className="text-xs text-red-500 mt-0.5">Active Alerts</p>
          </div>
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4 text-center">
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{highThreats}</p>
            <p className="text-xs text-gray-500 mt-0.5">High Threat</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-1 overflow-x-auto">
          {([
            { key: "all",     label: "All" },
            { key: "alerts",  label: `Alerts ${alerts > 0 ? `(${alerts})` : ""}` },
            { key: "high",    label: "High Threat" },
            { key: "medium",  label: "Medium Threat" },
            { key: "low",     label: "Low Threat" },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.key ? "bg-[#C8102E] text-white" : "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1,2,3,4].map(i => <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1F2E] py-16 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No competitors tracked yet</p>
            <p className="text-sm text-gray-400 mb-4">Add competitors to get alerted when their pricing changes relative to yours.</p>
            <button onClick={() => setShowAdd(true)} disabled={properties.length === 0}
              className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40">
              Track Your First Competitor
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map(c => <CompetitorCard key={c.id} comp={c} />)}
          </div>
        )}

        {/* Auto-tracking note */}
        <div className="mt-6 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-0.5">Auto-tracking coming soon</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">LUB will automatically pull competitor rents from Zillow and Rentometer weekly. You'll get an alert any time a competitor drops price or a new property opens near you — without manually checking.</p>
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddCompetitorModal properties={properties} onClose={() => setShowAdd(false)} onAdd={handleAdd} />
      )}
    </div>
  );
}
