"use client";

import { useState, useEffect, useCallback } from "react";
import { getOperatorEmail } from "@/lib/demo-auth";

// ─── Discover Modal ───────────────────────────────────────────────────────────

interface Suggestion {
  name: string;
  address: string;
  zip_code: string;
  city: string;
  state: string;
  their_low: number;
  their_high: number;
  listed_price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  threat_level: "high" | "medium" | "low";
  key_amenities: string[];
  property_type: string;
}

function DiscoverModal({ propertyId, propertyName, ourAvgRent, email, onClose, onAdded }: {
  propertyId: string;
  propertyName: string;
  ourAvgRent: number;
  email: string;
  onClose: () => void;
  onAdded: (comp: TrackedCompetitor) => void;
}) {
  const [status, setStatus]         = useState<"loading" | "results" | "error">("loading");
  const [errorMsg, setErrorMsg]     = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed]   = useState<Set<number>>(new Set());
  const [adding, setAdding]         = useState<Set<number>>(new Set());
  const [added, setAdded]           = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/competitors/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, property_id: propertyId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErrorMsg(d.error); setStatus("error"); return; }
        setSuggestions(d.competitors ?? []);
        setStatus("results");
      })
      .catch(() => { setErrorMsg("Network error. Try again."); setStatus("error"); });
  }, [email, propertyId]);

  async function handleAdd(idx: number, s: Suggestion) {
    setAdding(prev => new Set(prev).add(idx));
    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        property_id:   propertyId,
        name:          s.name,
        address:       s.address,
        zip_code:      s.zip_code,
        city:          s.city,
        state:         s.state,
        their_low:     s.their_low,
        their_high:    s.their_high,
        threat_level:  s.threat_level,
        key_amenities: s.key_amenities,
      }),
    });
    const json = await res.json();
    if (res.ok && json.competitor) {
      onAdded({
        ...json.competitor,
        property_name:    propertyName,
        our_avg_rent:     ourAvgRent,
        their_rent_range: `${fmt(s.their_low)}–${fmt(s.their_high)}`,
      });
      setAdded(prev => new Set(prev).add(idx));
    }
    setAdding(prev => { const n = new Set(prev); n.delete(idx); return n; });
  }

  const tc = (t: Suggestion["threat_level"]) => {
    if (t === "high")   return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
    if (t === "medium") return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
    return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
  };

  const remaining = suggestions.filter((_, i) => !dismissed.has(i) && !added.has(i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1C1F2E] border border-gray-100 dark:border-white/10 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-5 py-4 shrink-0">
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100">Discover Competitors</p>
            <p className="text-xs text-gray-400 mt-0.5">{propertyName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C8102E]" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Searching Rentcast…</p>
                <p className="text-xs text-gray-400 mt-1">Finding nearby rentals and analyzing which are real competitors</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-5 text-center">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Discovery failed</p>
              <p className="text-xs text-red-500">{errorMsg}</p>
            </div>
          )}

          {status === "results" && (
            <>
              {remaining.length === 0 && suggestions.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">All reviewed</p>
                  <p className="text-xs text-gray-400 mt-1">You&apos;ve gone through all nearby listings.</p>
                </div>
              )}

              {suggestions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No listings found</p>
                  <p className="text-xs text-gray-400 mt-1">Rentcast has no active listings for this area right now. Add competitors manually.</p>
                </div>
              )}

              {suggestions.length > 0 && remaining.length > 0 && (
                <p className="text-xs text-gray-400 mb-3">{remaining.length} listing{remaining.length !== 1 ? "s" : ""} found nearby — add the ones that are real competitors</p>
              )}

              <div className="space-y-3">
                {suggestions.map((s, i) => {
                  if (dismissed.has(i) || added.has(i)) return null;
                  const isAdding = adding.has(i);
                  const diff = ourAvgRent ? s.listed_price - ourAvgRent : null;
                  return (
                    <div key={i} className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 break-words">{s.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">ZIP {s.zip_code}{s.property_type ? ` · ${s.property_type}` : ""}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${tc(s.threat_level)}`}>
                          {s.threat_level} threat
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="rounded-lg bg-white dark:bg-white/5 p-2 text-center">
                          <p className="text-sm font-black text-gray-800 dark:text-gray-100">${s.listed_price.toLocaleString()}</p>
                          <p className="text-[9px] text-gray-400">Listed/mo</p>
                        </div>
                        <div className="rounded-lg bg-white dark:bg-white/5 p-2 text-center">
                          <p className="text-sm font-black text-gray-800 dark:text-gray-100">
                            {s.bedrooms !== null ? `${s.bedrooms}BR` : "—"}
                            {s.bathrooms !== null ? `/${s.bathrooms}BA` : ""}
                          </p>
                          <p className="text-[9px] text-gray-400">Unit</p>
                        </div>
                        <div className="rounded-lg bg-white dark:bg-white/5 p-2 text-center">
                          {diff !== null ? (
                            <p className={`text-sm font-black ${diff > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {diff > 0 ? `+$${diff}` : `-$${Math.abs(diff)}`}
                            </p>
                          ) : <p className="text-sm font-black text-gray-400">—</p>}
                          <p className="text-[9px] text-gray-400">vs. ours</p>
                        </div>
                      </div>

                      {s.key_amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {s.key_amenities.map(a => (
                            <span key={a} className="rounded-full border border-gray-200 dark:border-white/10 px-2 py-0.5 text-[10px] text-gray-500">{a}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setDismissed(prev => new Set(prev).add(i))}
                          className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => handleAdd(i, s)}
                          disabled={isAdding}
                          className="flex-1 rounded-lg bg-[#C8102E] py-2 text-xs font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
                        >
                          {isAdding ? "Adding…" : "Add to Tracker"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-white/5 px-5 py-3 shrink-0">
          <button onClick={onClose} className="w-full rounded-lg border border-gray-200 dark:border-white/10 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface TrackedCompetitor {
  id: string;
  name: string;
  property_name: string;
  property_id: string;
  city: string;
  state: string;
  our_avg_rent: number;
  their_low: number;
  their_high: number;
  their_rent_range: string;
  threat_level: "high" | "medium" | "low";
  key_amenities: string[];
  last_synced: string | null;
  alert: string | null;
  zip_code: string | null;
  address: string | null;
}

interface Property {
  id: string;
  name: string;
  city: string;
  state: string;
  avg_rent: number | null;
}

function threatColor(t: TrackedCompetitor["threat_level"]) {
  if (t === "high")   return { badge: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",     dot: "bg-red-500",    border: "border-red-200 dark:border-red-900/30" };
  if (t === "medium") return { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", dot: "bg-amber-500", border: "border-amber-100 dark:border-amber-900/20" };
  return              { badge: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",    dot: "bg-green-500",  border: "border-gray-100 dark:border-white/5" };
}

function pricePosition(ours: number, low: number, high: number): { label: string; color: string } {
  const mid = (low + high) / 2;
  if (ours < low)       return { label: "Priced Below Market", color: "text-blue-600 dark:text-blue-400" };
  if (ours > high)      return { label: "Priced Above Market", color: "text-red-600 dark:text-red-400" };
  if (ours < mid - 50)  return { label: "Competitive",         color: "text-green-600 dark:text-green-400" };
  if (ours > mid + 100) return { label: "Slightly High",       color: "text-amber-600 dark:text-amber-400" };
  return                        { label: "Market Rate",         color: "text-green-600 dark:text-green-400" };
}

function fmt(n: number) { return `$${n.toLocaleString()}`; }

function CompetitorCard({ comp, onSync, onDelete, syncing }: {
  comp: TrackedCompetitor;
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
  syncing: boolean;
}) {
  const tc  = threatColor(comp.threat_level);
  const pos = pricePosition(comp.our_avg_rent, comp.their_low, comp.their_high);
  const diff = comp.our_avg_rent - Math.round((comp.their_low + comp.their_high) / 2);
  const lastSynced = comp.last_synced
    ? new Date(comp.last_synced).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

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
          <p className="text-xs text-gray-400 mt-0.5">
            {comp.city}{comp.state ? `, ${comp.state}` : ""}
            {comp.zip_code ? ` · ZIP ${comp.zip_code}` : ""}
          </p>
        </div>
        <span className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold ${tc.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tc.dot}`} />
          {comp.threat_level.charAt(0).toUpperCase() + comp.threat_level.slice(1)} Threat
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-2.5 text-center">
          <p className="text-sm font-black text-gray-800 dark:text-gray-100">{fmt(comp.our_avg_rent)}</p>
          <p className="text-[9px] text-gray-400">Our avg. rent</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-2.5 text-center">
          <p className="text-sm font-black text-gray-800 dark:text-gray-100">{fmt(comp.their_low)}–{fmt(comp.their_high)}</p>
          <p className="text-[9px] text-gray-400">Their range</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-2.5 text-center">
          <p className={`text-sm font-black ${diff > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
            {diff > 0 ? `+${fmt(diff)}` : `-${fmt(Math.abs(diff))}`}
          </p>
          <p className="text-[9px] text-gray-400">vs. their mid</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold ${pos.color}`}>{pos.label}</span>
        <span className="text-[10px] text-gray-400">
          {lastSynced ? `Synced ${lastSynced}` : comp.zip_code ? "Never synced" : "Manual entry"}
        </span>
      </div>

      {comp.key_amenities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {comp.key_amenities.map(a => (
            <span key={a} className="rounded-full border border-gray-200 dark:border-white/10 px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">{a}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
        {comp.zip_code && (
          <button
            onClick={() => onSync(comp.id)}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
          >
            {syncing ? <span className="h-3 w-3 animate-spin rounded-full border border-gray-400/30 border-t-gray-500" /> : "↻"}
            Sync
          </button>
        )}
        {!comp.zip_code && (
          <span className="text-[10px] text-gray-400 italic">Add ZIP code to enable auto-sync</span>
        )}
        <button
          onClick={() => onDelete(comp.id)}
          className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function AddCompetitorModal({ properties, avgRentByProperty, defaultPropertyId, onClose, onAdd }: {
  properties: Property[];
  avgRentByProperty: Record<string, number>;
  defaultPropertyId: string;
  onClose: () => void;
  onAdd: (comp: TrackedCompetitor) => void;
}) {
  const [propertyId, setPropertyId] = useState(defaultPropertyId || properties[0]?.id || "");
  const [name, setName]             = useState("");
  const [address, setAddress]       = useState("");
  const [zipCode, setZipCode]       = useState("");
  const [rentLow, setRentLow]       = useState("");
  const [rentHigh, setRentHigh]     = useState("");
  const [threat, setThreat]         = useState<TrackedCompetitor["threat_level"]>("medium");
  const [amenities, setAmenities]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const property    = properties.find(p => p.id === propertyId);
  const ourAvgRent  = avgRentByProperty[propertyId] ?? null;

  async function handleAdd() {
    if (!name.trim() || !rentLow || !rentHigh || !property || ourAvgRent === null) return;
    setSaving(true);
    setError("");
    const email = await (await import("@/lib/demo-auth")).getOperatorEmail();
    const low = parseInt(rentLow), high = parseInt(rentHigh);
    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        property_id:   propertyId,
        name:          name.trim(),
        address:       address.trim() || null,
        zip_code:      zipCode.trim() || null,
        city:          property.city,
        state:         property.state,
        their_low:     low,
        their_high:    high,
        threat_level:  threat,
        key_amenities: amenities.split(",").map(a => a.trim()).filter(Boolean),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.competitor) { setError(json.error ?? "Failed to save"); setSaving(false); return; }
    onAdd({
      ...json.competitor,
      property_name:    property.name,
      our_avg_rent:     ourAvgRent,
      their_rent_range: `${fmt(low)}–${fmt(high)}`,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1C1F2E] border border-gray-100 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
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
            {ourAvgRent !== null && (
              <p className="mt-1 text-[10px] text-gray-400">Avg. rent for this property: {fmt(ourAvgRent)}/mo</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Competitor Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="The Reserve at Oak Park"
              className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                ZIP Code <span className="text-[#C8102E]">*for auto-sync</span>
              </label>
              <input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="30301"
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Address (optional)</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St"
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Their Current Rent Range ($)</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={rentLow} onChange={e => setRentLow(e.target.value)} placeholder="Low (e.g. 1100)"
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
              <input type="number" value={rentHigh} onChange={e => setRentHigh(e.target.value)} placeholder="High (e.g. 1800)"
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
            </div>
            {zipCode && <p className="mt-1 text-[10px] text-gray-400">Once added, hit Sync to pull live Rentcast market data for this ZIP.</p>}
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

          {ourAvgRent === null && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              This property has no unit rent data yet. Add units with monthly rent to enable price comparison.
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !name.trim() || !rentLow || !rentHigh || ourAvgRent === null}
              className="flex-1 rounded-lg bg-[#C8102E] py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40">
              {saving ? "Saving…" : "Add Competitor"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors]     = useState<TrackedCompetitor[]>([]);
  const [properties, setProperties]       = useState<Property[]>([]);
  const [avgRentByProperty, setAvgRentByProperty] = useState<Record<string, number>>({});
  const [loading, setLoading]             = useState(true);
  const [showAdd, setShowAdd]             = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [filter, setFilter]               = useState<"all" | "high" | "medium" | "low" | "alerts">("all");
  const [syncingAll, setSyncingAll]       = useState(false);
  const [syncingId, setSyncingId]         = useState<string | null>(null);
  const [email, setEmail]                 = useState<string>("");
  const [showDiscover, setShowDiscover]   = useState(false);

  const loadCompetitors = useCallback(async (propId: string, em: string, avgRents: Record<string, number>) => {
    const res  = await fetch(`/api/competitors?email=${encodeURIComponent(em)}&property_id=${propId}`);
    const json = await res.json();
    const raw  = json.competitors ?? [];
    const ourRent = avgRents[propId] ?? 0;
    setCompetitors(raw.map((c: TrackedCompetitor) => ({
      ...c,
      our_avg_rent:     ourRent,
      their_rent_range: `${fmt(c.their_low)}–${fmt(c.their_high)}`,
      property_name:    properties.find(p => p.id === propId)?.name ?? "",
    })));
  }, [properties]);

  useEffect(() => {
    (async () => {
      const em = await (await import("@/lib/demo-auth")).getOperatorEmail();
      if (!em) { setLoading(false); return; }
      setEmail(em);

      const [propsRes, unitsRes] = await Promise.all([
        fetch(`/api/properties?email=${encodeURIComponent(em)}`),
        fetch(`/api/units?email=${encodeURIComponent(em)}`),
      ]);
      const propsData = await propsRes.json();
      const unitsData = await unitsRes.json();
      const avgRents: Record<string, number> = unitsData.avgRentByProperty ?? {};

      const props: Property[] = (propsData.properties ?? []).map((p: { id: string; name: string; city: string; state: string }) => ({
        id: p.id, name: p.name, city: p.city ?? "", state: p.state ?? "", avg_rent: avgRents[p.id] ?? null,
      }));
      setProperties(props);
      setAvgRentByProperty(avgRents);

      if (props.length > 0) {
        setSelectedPropertyId(props[0].id);
        await loadCompetitors(props[0].id, em, avgRents);
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePropertySelect(propId: string) {
    setSelectedPropertyId(propId);
    setFilter("all");
    if (email) await loadCompetitors(propId, email, avgRentByProperty);
  }

  async function handleSync(competitorId: string) {
    if (!email || !selectedPropertyId) return;
    setSyncingId(competitorId);
    await fetch("/api/competitors/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, property_id: selectedPropertyId, competitor_id: competitorId }),
    });
    await loadCompetitors(selectedPropertyId, email, avgRentByProperty);
    setSyncingId(null);
  }

  async function handleSyncAll() {
    if (!email || !selectedPropertyId) return;
    setSyncingAll(true);
    await fetch("/api/competitors/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, property_id: selectedPropertyId }),
    });
    await loadCompetitors(selectedPropertyId, email, avgRentByProperty);
    setSyncingAll(false);
  }

  async function handleDelete(competitorId: string) {
    if (!email) return;
    await fetch(`/api/competitors?email=${encodeURIComponent(email)}&id=${competitorId}`, { method: "DELETE" });
    setCompetitors(prev => prev.filter(c => c.id !== competitorId));
  }

  function handleAdd(comp: TrackedCompetitor) {
    setCompetitors(prev => [comp, ...prev]);
    setSelectedPropertyId(comp.property_id);
  }

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const filtered = competitors.filter(c => {
    if (filter === "alerts") return c.alert != null;
    if (filter === "all")    return true;
    return c.threat_level === filter;
  });

  const alerts     = competitors.filter(c => c.alert != null).length;
  const highThreats = competitors.filter(c => c.threat_level === "high").length;

  // Count competitors per property tab from all loaded data (approximate from current property)
  function getTabCompCount(propId: string) {
    return propId === selectedPropertyId ? competitors.length : null;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0E1017]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Competitor Tracking</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Live market rent data per property — synced weekly via Rentcast</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSyncAll} disabled={syncingAll || competitors.filter(c => c.zip_code).length === 0}
              className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 transition-colors">
              {syncingAll
                ? <><span className="h-3 w-3 animate-spin rounded-full border border-gray-400/30 border-t-gray-500" />Syncing…</>
                : "↻ Sync All"}
            </button>
            <button
              onClick={() => setShowDiscover(true)}
              disabled={properties.length === 0 || !selectedPropertyId}
              className="flex items-center gap-2 rounded-xl border border-[#C8102E] bg-[#C8102E]/10 px-4 py-2 text-sm font-bold text-[#C8102E] hover:bg-[#C8102E]/20 disabled:opacity-40 transition-colors"
            >
              ✦ Discover
            </button>
            <button onClick={() => setShowAdd(true)} disabled={properties.length === 0}
              className="flex items-center gap-2 rounded-xl bg-[#C8102E] px-4 py-2 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
              + Add Manual
            </button>
          </div>
        </div>

        {/* Property tabs */}
        {properties.length > 0 && (
          <div className="mb-5 overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-1">
              {properties.map(p => {
                const count    = getTabCompCount(p.id);
                const isActive = p.id === selectedPropertyId;
                return (
                  <button key={p.id} onClick={() => handlePropertySelect(p.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors border ${
                      isActive
                        ? "bg-[#C8102E] text-white border-[#C8102E] shadow-sm shadow-[#C8102E]/20"
                        : "bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                    }`}>
                    <span className="truncate max-w-[160px]">{p.name}</span>
                    {count !== null && count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected property context */}
        {selectedProperty && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C8102E]/10">
              <svg viewBox="0 0 18 18" fill="none" stroke="#C8102E" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M1.5 16.5V7.5L9 2.5l7.5 5v9" /><path d="M6.5 16.5v-5h5v5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{selectedProperty.name}</p>
              <p className="text-xs text-gray-400">
                {selectedProperty.city}{selectedProperty.state ? `, ${selectedProperty.state}` : ""} ·{" "}
                {selectedProperty.avg_rent !== null ? `Avg. rent ${fmt(selectedProperty.avg_rent)}/mo` : "No unit data yet"}
              </p>
            </div>
            <p className="text-xs text-gray-400 shrink-0">{competitors.length} competitor{competitors.length !== 1 ? "s" : ""}</p>
          </div>
        )}

        {/* Stats */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4 text-center">
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{competitors.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Tracked</p>
          </div>
          <div className={`rounded-xl border p-4 text-center ${alerts > 0 ? "border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10" : "border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E]"}`}>
            <p className={`text-2xl font-black ${alerts > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>{alerts}</p>
            <p className={`text-xs mt-0.5 ${alerts > 0 ? "text-red-500" : "text-gray-500"}`}>Active Alerts</p>
          </div>
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4 text-center">
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{highThreats}</p>
            <p className="text-xs text-gray-500 mt-0.5">High Threat</p>
          </div>
        </div>

        {/* Threat filters */}
        <div className="mb-4 flex gap-1 overflow-x-auto">
          {([
            { key: "all",    label: "All" },
            { key: "alerts", label: `Alerts${alerts > 0 ? ` (${alerts})` : ""}` },
            { key: "high",   label: "High Threat" },
            { key: "medium", label: "Medium Threat" },
            { key: "low",    label: "Low Threat" },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.key ? "bg-[#C8102E] text-white" : "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1,2,3,4].map(i => <div key={i} className="h-52 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1F2E] py-16 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {filter !== "all" ? "No competitors match this filter" : `No competitors tracked for ${selectedProperty?.name ?? "this property"}`}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {filter !== "all" ? "Try a different filter or add more competitors." : "Add nearby competitors — include their ZIP code to enable weekly auto-sync via Rentcast."}
            </p>
            {filter === "all" && (
              <button onClick={() => setShowAdd(true)} disabled={properties.length === 0}
                className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40">
                Track First Competitor
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map(c => (
              <CompetitorCard
                key={c.id}
                comp={c}
                onSync={handleSync}
                onDelete={handleDelete}
                syncing={syncingId === c.id || syncingAll}
              />
            ))}
          </div>
        )}

        {/* Auto-sync status */}
        <div className="mt-6 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-0.5">Auto-sync active — every Monday 6am</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                LUB pulls live market rent data from Rentcast weekly for every competitor with a ZIP code. You&apos;ll get an alert automatically if a competitor&apos;s market drops by $50+ since the last sync.
                Requires <code className="rounded bg-gray-100 dark:bg-white/10 px-1 text-[10px]">RENTCAST_API_KEY</code> in your Vercel environment variables.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddCompetitorModal
          properties={properties}
          avgRentByProperty={avgRentByProperty}
          defaultPropertyId={selectedPropertyId}
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}

      {showDiscover && selectedPropertyId && email && (
        <DiscoverModal
          propertyId={selectedPropertyId}
          propertyName={selectedProperty?.name ?? ""}
          ourAvgRent={avgRentByProperty[selectedPropertyId] ?? 0}
          email={email}
          onClose={() => setShowDiscover(false)}
          onAdded={comp => {
            setCompetitors(prev => [comp, ...prev.filter(c => c.id !== comp.id)]);
          }}
        />
      )}
    </div>
  );
}
