"use client";

import { useState, useEffect, useCallback } from "react";
import { getOperatorEmail, authFetch } from "@/lib/demo-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Competitor {
  id: string;
  name: string;
  property_name: string | null;
  address: string | null;
  their_low: number;
  their_high: number;
  concession: string | null;
  units_available: number | null;
  threat_level: "high" | "medium" | "low";
  notes: string | null;
  last_updated: string;
  distance_miles: number | null;
  website_url: string | null;
}

interface Property {
  id: string;
  name: string;
  city: string;
  state: string;
}

type FormState = {
  name: string;
  address: string;
  their_low: string;
  their_high: string;
  concession: string;
  units_available: string;
  threat_level: "high" | "medium" | "low";
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "", address: "", their_low: "", their_high: "",
  concession: "", units_available: "", threat_level: "medium", notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mid(c: Competitor) { return Math.round((c.their_low + c.their_high) / 2); }
function fmt(n: number) { return `$${n.toLocaleString()}`; }

function threatConfig(t: Competitor["threat_level"]) {
  if (t === "high")   return { label: "High threat",   dot: "bg-red-500",   text: "text-red-600 dark:text-red-400",   bg: "bg-red-50 dark:bg-red-900/20" };
  if (t === "medium") return { label: "Medium threat", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" };
  return               { label: "Low threat",    dot: "bg-gray-400",  text: "text-gray-500 dark:text-gray-400",  bg: "bg-gray-100 dark:bg-white/5" };
}

function staleness(updated: string) {
  const days = Math.floor((Date.now() - new Date(updated).getTime()) / 86_400_000);
  if (days === 0) return { label: "Updated today", stale: false };
  if (days === 1) return { label: "Updated yesterday", stale: false };
  if (days <= 7)  return { label: `Updated ${days}d ago`, stale: false };
  if (days <= 30) return { label: `Updated ${days}d ago`, stale: true };
  return { label: `Updated ${days}d ago`, stale: true };
}

// ─── Price Ladder ─────────────────────────────────────────────────────────────

function PriceLadder({ competitors, ourRent, ourName }: {
  competitors: Competitor[];
  ourRent: number;
  ourName: string;
}) {
  type Bar = { label: string; low: number; high: number; midVal: number; isOurs: boolean };
  const bars: Bar[] = [
    { label: ourName, low: ourRent, high: ourRent, midVal: ourRent, isOurs: true },
    ...competitors.map(c => ({ label: c.name, low: c.their_low, high: c.their_high, midVal: mid(c), isOurs: false })),
  ].sort((a, b) => a.midVal - b.midVal);

  const allPrices = bars.flatMap(b => [b.low, b.high]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const span = maxP - minP || 1;
  const pct  = (v: number) => Math.max(0, Math.min(100, ((v - minP) / span) * 100));

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-5">
        Rent Ladder
      </p>
      <div className="space-y-3">
        {bars.map((b, i) => (
          <div key={i} className="flex items-center gap-3">
            <p className={`w-32 shrink-0 truncate text-xs ${b.isOurs ? "font-black text-[#C8102E]" : "font-medium text-gray-600 dark:text-gray-400"}`}>
              {b.isOurs ? "◆ " : ""}{b.label}
            </p>
            <div className="relative flex-1 h-5 flex items-center">
              <div className="absolute inset-x-0 h-px bg-gray-100 dark:bg-white/5" />
              {b.isOurs ? (
                <div
                  className="absolute h-4 rounded-md bg-[#C8102E]/15 border-2 border-[#C8102E]"
                  style={{ left: `${pct(b.low)}%`, width: `${Math.max(pct(b.high) - pct(b.low), 1.5)}%` }}
                />
              ) : (
                <div
                  className="absolute h-3 rounded-md bg-gray-200 dark:bg-white/10"
                  style={{ left: `${pct(b.low)}%`, width: `${Math.max(pct(b.high) - pct(b.low), 1.5)}%` }}
                />
              )}
              <div
                className={`absolute h-2.5 w-2.5 rounded-full -translate-x-1/2 ${b.isOurs ? "bg-[#C8102E] z-10" : "bg-gray-400 dark:bg-gray-500"}`}
                style={{ left: `${pct(b.midVal)}%` }}
              />
            </div>
            <p className={`w-24 shrink-0 text-right text-xs font-bold ${b.isOurs ? "text-[#C8102E]" : "text-gray-500 dark:text-gray-400"}`}>
              {b.low === b.high ? fmt(b.midVal) : `${fmt(b.low)}–${fmt(b.high)}`}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-gray-400 border-t border-gray-50 dark:border-white/5 pt-3">
        <span>{fmt(minP)}</span>
        <span>{fmt(Math.round((minP + maxP) / 2))}</span>
        <span>{fmt(maxP)}</span>
      </div>
    </div>
  );
}

// ─── Concession Board ─────────────────────────────────────────────────────────

function ConcessionBoard({ competitors }: { competitors: Competitor[] }) {
  const active = competitors.filter(c => c.concession);

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
        Active Concessions
      </p>
      {active.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
          No competitors running specials
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(c => (
            <div key={c.id} className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 px-3 py-2.5">
              <span className="text-amber-500 text-sm shrink-0 mt-0.5">⚡</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{c.name}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{c.concession}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vacancy Signal ───────────────────────────────────────────────────────────

function VacancySignal({ competitors }: { competitors: Competitor[] }) {
  const withData = competitors.filter(c => c.units_available != null);
  const total    = withData.reduce((s, c) => s + (c.units_available ?? 0), 0);

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
        Vacancy Signal
      </p>
      {withData.length === 0 ? (
        <p className="text-sm text-gray-400">No vacancy data yet — add unit counts to competitors</p>
      ) : (
        <>
          <div className="flex items-end gap-2 mb-4">
            <p className="text-4xl font-black text-gray-900 dark:text-gray-100">{total}</p>
            <p className="text-sm text-gray-400 mb-1">units competing for renters</p>
          </div>
          <div className="space-y-2">
            {withData
              .sort((a, b) => (b.units_available ?? 0) - (a.units_available ?? 0))
              .map(c => {
                const max = Math.max(...withData.map(x => x.units_available ?? 0));
                const w   = max > 0 ? Math.round(((c.units_available ?? 0) / max) * 100) : 0;
                const pressure = (c.units_available ?? 0) >= 5 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300";
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <p className="w-28 shrink-0 truncate text-xs text-gray-500">{c.name}</p>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/5">
                      <div className="h-full rounded-full bg-gray-300 dark:bg-white/20 transition-all" style={{ width: `${w}%` }} />
                    </div>
                    <p className={`w-10 text-right text-xs font-black shrink-0 ${pressure}`}>
                      {c.units_available}
                    </p>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Competitor Card ──────────────────────────────────────────────────────────

function CompetitorCard({ comp, ourRent, onEdit, onDelete, onEnrich }: {
  comp: Competitor;
  ourRent: number;
  onEdit: (c: Competitor) => void;
  onDelete: (id: string) => void;
  onEnrich: (id: string) => void;
}) {
  const compMid  = mid(comp);
  const diff     = compMid - ourRent;
  const absDiff  = Math.abs(diff);
  const tc       = threatConfig(comp.threat_level);
  const age      = staleness(comp.last_updated);

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
              {comp.property_name ?? comp.name}
            </p>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${tc.bg} ${tc.text}`}>
              {comp.threat_level}
            </span>
            {!comp.property_name && (
              <button
                onClick={() => onEnrich(comp.id)}
                className="rounded-full border border-dashed border-gray-300 dark:border-white/20 px-2 py-0.5 text-[9px] font-semibold text-gray-400 hover:border-[#C8102E] hover:text-[#C8102E] transition-colors">
                Find name
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {comp.address && (
              <p className="text-[11px] text-gray-400 truncate">{comp.address}</p>
            )}
            {comp.distance_miles != null && (
              <span className="shrink-0 rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-gray-500 dark:text-gray-400">
                {comp.distance_miles} mi away
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-xl font-black ${diff > 0 ? "text-green-600 dark:text-green-400" : diff < 0 ? "text-red-600 dark:text-red-400" : "text-gray-500"}`}>
            {diff === 0 ? "Same" : diff > 0 ? `-${fmt(absDiff)}` : `+${fmt(absDiff)}`}
          </p>
          <p className="text-[10px] text-gray-400">
            {diff > 0 ? "cheaper than us" : diff < 0 ? "pricier than us" : "vs. our rent"}
          </p>
        </div>
      </div>

      {/* Rent range */}
      <div className="mb-3 rounded-xl bg-gray-50 dark:bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-black text-gray-800 dark:text-gray-100">
              {comp.their_low === comp.their_high ? fmt(comp.their_low) : `${fmt(comp.their_low)}–${fmt(comp.their_high)}`}
            </p>
            <p className="text-[10px] text-gray-400">their rent range / mo</p>
          </div>
          {comp.units_available != null && (
            <div className="text-right">
              <p className={`text-lg font-black ${comp.units_available >= 5 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-200"}`}>
                {comp.units_available}
              </p>
              <p className="text-[10px] text-gray-400">units available</p>
            </div>
          )}
        </div>
      </div>

      {/* Concession */}
      {comp.concession && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 px-3 py-2">
          <span className="text-amber-500 text-xs shrink-0">⚡</span>
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{comp.concession}</p>
        </div>
      )}

      {/* Notes */}
      {comp.notes && (
        <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400 italic leading-relaxed">{comp.notes}</p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-50 dark:border-white/5">
        <span className={`flex-1 text-[10px] ${age.stale ? "text-amber-500" : "text-gray-400"}`}>
          {age.stale ? "⚠ " : ""}{age.label}
        </span>
        <button onClick={() => onEdit(comp)}
          className="rounded-lg border border-gray-200 dark:border-white/10 px-2.5 py-1 text-[10px] font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          Edit
        </button>
        <button onClick={() => onDelete(comp.id)}
          className="rounded-lg px-2.5 py-1 text-[10px] font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function CompetitorModal({ properties, defaultPropertyId, email, editing, onClose, onSaved }: {
  properties: Property[];
  defaultPropertyId: string;
  email: string;
  editing: Competitor | null;
  onClose: () => void;
  onSaved: (comp: Competitor, isNew: boolean) => void;
}) {
  const [propertyId, setPropertyId] = useState(defaultPropertyId || properties[0]?.id || "");
  const [form, setForm]             = useState<FormState>(
    editing ? {
      name:            editing.name,
      address:         editing.address ?? "",
      their_low:       String(editing.their_low),
      their_high:      String(editing.their_high),
      concession:      editing.concession ?? "",
      units_available: editing.units_available != null ? String(editing.units_available) : "",
      threat_level:    editing.threat_level,
      notes:           editing.notes ?? "",
    } : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function set(k: keyof FormState, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim() || !form.their_low || !form.their_high) return;
    setSaving(true); setError("");

    const payload = {
      email, property_id: propertyId,
      name:            form.name.trim(),
      address:         form.address.trim() || null,
      their_low:       parseInt(form.their_low),
      their_high:      parseInt(form.their_high),
      concession:      form.concession.trim() || null,
      units_available: form.units_available ? parseInt(form.units_available) : null,
      threat_level:    form.threat_level,
      notes:           form.notes.trim() || null,
    };

    let res: Response;
    if (editing) {
      res = await fetch("/api/competitors", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: editing.id }),
      });
    } else {
      res = await fetch("/api/competitors", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to save"); setSaving(false); return; }
    onSaved(json.competitor, !editing);
    onClose();
  }

  const isValid = form.name.trim() && form.their_low && form.their_high &&
    parseInt(form.their_low) > 0 && parseInt(form.their_high) >= parseInt(form.their_low);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1C1F2E] border border-gray-100 dark:border-white/10 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-5 py-4 shrink-0">
          <p className="font-bold text-gray-900 dark:text-gray-100">{editing ? "Edit Competitor" : "Add Competitor"}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Property (only when adding) */}
          {!editing && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Competes with</label>
              <select value={propertyId} onChange={e => setPropertyId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-[#C8102E]">
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Competitor Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Oak Creek Flats"
              className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
          </div>

          {/* Address */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Address <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Main St, Lubbock TX"
              className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
          </div>

          {/* Rent range */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Their Rent Range ($/mo) <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={form.their_low} onChange={e => set("their_low", e.target.value)} placeholder="Low (e.g. 950)"
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
              <input type="number" value={form.their_high} onChange={e => set("their_high", e.target.value)} placeholder="High (e.g. 1350)"
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
            </div>
          </div>

          {/* Concession */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Active Concession <span className="text-gray-400 font-normal">— what special are they running?</span>
            </label>
            <input value={form.concession} onChange={e => set("concession", e.target.value)} placeholder="1 month free, No deposit through April…"
              className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
          </div>

          {/* Units available */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Units Currently Available <span className="text-gray-400 font-normal">— how many are they advertising?</span>
            </label>
            <input type="number" value={form.units_available} onChange={e => set("units_available", e.target.value)} placeholder="e.g. 4"
              className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]" />
          </div>

          {/* Threat level */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-500">Threat Level</label>
            <div className="grid grid-cols-3 gap-2">
              {(["high", "medium", "low"] as const).map(t => {
                const tc = threatConfig(t);
                return (
                  <button key={t} onClick={() => set("threat_level", t)}
                    className={`rounded-lg border py-2 text-xs font-semibold capitalize transition-colors ${
                      form.threat_level === t
                        ? `${tc.bg} ${tc.text} border-current`
                        : "border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${tc.dot} mr-1.5`} />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
              placeholder="New pool under construction, repositioning to luxury…"
              className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E] resize-none" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="border-t border-gray-100 dark:border-white/5 px-5 py-4 flex gap-2 shrink-0">
          <button onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !isValid}
            className="flex-1 rounded-lg bg-[#C8102E] py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Competitor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Discover Modal ───────────────────────────────────────────────────────────

interface DiscoverResult {
  address: string;
  city: string;
  state: string;
  zip_code: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  property_type: string | null;
  distance: number | null;
  similarity: number | null;
  last_seen: string | null;
  amenities?: string[];
}

function DiscoverModal({ propertyId, propertyName, email, onClose, onAdded }: {
  propertyId: string;
  propertyName: string;
  email: string;
  onClose: () => void;
  onAdded: (comp: Competitor) => void;
}) {
  const [status, setStatus]           = useState<"loading" | "results" | "error">("loading");
  const [errorMsg, setErrorMsg]       = useState("");
  const [results, setResults]         = useState<DiscoverResult[]>([]);
  const [searchLabel, setSearchLabel] = useState("");
  const [added, setAdded]             = useState<Set<number>>(new Set());
  const [adding, setAdding]           = useState<Set<number>>(new Set());
  const [addErrors, setAddErrors]     = useState<Record<number, string>>({});

  // Enrichment: property_name + concession looked up from website
  type Enrichment = { property_name: string | null; concession: string | null; website_url: string | null };
  const [enriched, setEnriched]       = useState<Record<number, Enrichment>>({});
  const [enriching, setEnriching]     = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/competitors/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, property_id: propertyId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErrorMsg(d.error); setStatus("error"); return; }
        setResults(d.results ?? []);
        setSearchLabel(d.search_label ?? "");
        setStatus("results");
      })
      .catch(() => { setErrorMsg("Network error — please try again."); setStatus("error"); });
  }, [email, propertyId]);

  async function checkSpecials(i: number, r: DiscoverResult): Promise<Enrichment> {
    if (enriched[i]) return enriched[i];
    setEnriching(prev => new Set(prev).add(i));
    try {
      const res = await fetch("/api/competitors/check-specials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: r.address, city: r.city, state: r.state }),
      });
      const json = await res.json();
      const result: Enrichment = {
        property_name: json.property_name ?? null,
        concession:    json.concession    ?? null,
        website_url:   json.website_url   ?? null,
      };
      setEnriched(prev => ({ ...prev, [i]: result }));
      return result;
    } catch {
      return { property_name: null, concession: null, website_url: null };
    } finally {
      setEnriching(prev => { const n = new Set(prev); n.delete(i); return n; });
    }
  }

  async function handleAdd(i: number, r: DiscoverResult) {
    setAdding(prev => new Set(prev).add(i));
    setAddErrors(prev => { const n = { ...prev }; delete n[i]; return n; });

    // Check the property website for specials before saving
    const extra = await checkSpecials(i, r);

    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        property_id:    propertyId,
        name:           r.address,
        address:        r.address,
        their_low:      r.price ?? 0,
        their_high:     r.price ?? 0,
        threat_level:   "medium",
        concession:     extra.concession,
        website_url:    extra.website_url,
        property_name:  extra.property_name,
        distance_miles: r.distance,
      }),
    });
    const json = await res.json();

    if (res.ok && json.competitor) {
      onAdded(json.competitor);
      setAdded(prev => new Set(prev).add(i));
    } else {
      setAddErrors(prev => ({ ...prev, [i]: json.error ?? "Failed to add — try again" }));
    }

    setAdding(prev => { const n = new Set(prev); n.delete(i); return n; });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#1C1F2E] border border-gray-100 dark:border-white/10 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-5 py-4 shrink-0">
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100">Nearby Properties</p>
            <p className="text-xs text-gray-400 mt-0.5">{propertyName} · Rentcast data</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {status === "loading" && (
            <div className="flex flex-col items-center py-16 gap-4">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C8102E]" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Searching your market…</p>
                <p className="text-xs text-gray-400 mt-1">Pulling Rentcast comparable listings for this address…</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-5 text-center">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Search failed</p>
              <p className="text-xs text-red-500">{errorMsg}</p>
            </div>
          )}

          {status === "results" && (
            <>
              <p className="text-xs text-gray-400 mb-4">
                {results.length} propert{results.length !== 1 ? "ies" : "y"} found
                {searchLabel ? ` · ${searchLabel}` : ""}
                {" "}— add the ones that compete with you
              </p>
              <div className="space-y-3">
                {results.map((r, i) => {
                  const isAdded    = added.has(i);
                  const isAdding   = adding.has(i);
                  const isEnriching = enriching.has(i);
                  const extra      = enriched[i];
                  const displayName = extra?.property_name ?? null;

                  return (
                    <div key={i} className={`rounded-xl border p-4 transition-colors ${isAdded ? "border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-900/10" : "border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Property name (marketing name if found, else street address) */}
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 break-words leading-snug">
                            {displayName ?? r.address.split(",")[0]}
                          </p>
                          {/* Full address always shown smaller */}
                          <p className="text-[11px] text-gray-400 mt-0.5 break-words">
                            {r.address}
                            {r.property_type ? ` · ${r.property_type}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {r.price ? (
                            <>
                              <p className="text-base font-black text-gray-800 dark:text-gray-100">${r.price.toLocaleString()}</p>
                              <p className="text-[10px] text-gray-400">/mo</p>
                            </>
                          ) : (
                            <p className="text-xs text-gray-400 italic">No price</p>
                          )}
                        </div>
                      </div>

                      {/* Detail badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {r.distance != null && (
                          <span className="rounded-full bg-[#C8102E]/10 border border-[#C8102E]/20 px-2 py-0.5 text-[10px] font-bold text-[#C8102E]">
                            {r.distance} mi away
                          </span>
                        )}
                        {r.bedrooms != null && (
                          <span className="rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 px-2 py-0.5 text-[10px] text-gray-500">{r.bedrooms}BR</span>
                        )}
                        {r.bathrooms != null && (
                          <span className="rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 px-2 py-0.5 text-[10px] text-gray-500">{r.bathrooms}BA</span>
                        )}
                        {r.sqft != null && (
                          <span className="rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 px-2 py-0.5 text-[10px] text-gray-500">{r.sqft.toLocaleString()} sqft</span>
                        )}
                        {r.last_seen && (
                          <span className="rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 px-2 py-0.5 text-[10px] text-gray-500">
                            Listed {new Date(r.last_seen).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>

                      {/* Concession — shown if website check found one */}
                      {extra?.concession && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 px-2.5 py-1.5">
                          <span className="text-amber-500 text-xs shrink-0">⚡</span>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">{extra.concession}</p>
                        </div>
                      )}
                      {extra && !extra.concession && (
                        <p className="mt-2 text-[10px] text-gray-400 italic">No active specials found on their website</p>
                      )}

                      <div className="mt-3">
                        {isAdded ? (
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Added to tracker</p>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAdd(i, r)}
                              disabled={isAdding || isEnriching}
                              className="w-full rounded-lg bg-[#C8102E] py-2 text-xs font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
                              {isEnriching ? "Checking website…" : isAdding ? "Adding…" : "Add to Tracker"}
                            </button>
                            {addErrors[i] && (
                              <p className="mt-1.5 text-[10px] text-red-500">{addErrors[i]}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-white/5 px-5 py-3 shrink-0">
          <button onClick={onClose}
            className="w-full rounded-lg border border-gray-200 dark:border-white/10 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompetitorsPage() {
  const [properties, setProperties]         = useState<Property[]>([]);
  const [selectedId, setSelectedId]         = useState("");
  const [avgRentByProperty, setAvgRentByProperty] = useState<Record<string, number>>({});
  const [competitors, setCompetitors]       = useState<Competitor[]>([]);
  const [loading, setLoading]               = useState(true);
  const [compLoading, setCompLoading]       = useState(false);
  const [email, setEmail]                   = useState("");
  const [showModal, setShowModal]           = useState(false);
  const [showDiscover, setShowDiscover]     = useState(false);
  const [editing, setEditing]               = useState<Competitor | null>(null);

  const loadCompetitors = useCallback(async (propId: string) => {
    setCompLoading(true);
    const res  = await authFetch(`/api/competitors?property_id=${propId}`);
    const json = await res.json();
    setCompetitors(json.competitors ?? []);
    setCompLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const em = await getOperatorEmail();
      if (!em) { setLoading(false); return; }
      setEmail(em);

      const [propsRes, unitsRes] = await Promise.all([
        authFetch(`/api/properties`),
        authFetch(`/api/units`),
      ]);
      const propsData = await propsRes.json();
      const unitsData = await unitsRes.json();

      const props: Property[] = (propsData.properties ?? []).map((p: Property) => ({
        id: p.id, name: p.name, city: p.city ?? "", state: p.state ?? "",
      }));

      setProperties(props);
      setAvgRentByProperty(unitsData.avgRentByProperty ?? {});

      if (props.length > 0) {
        setSelectedId(props[0].id);
        await loadCompetitors(props[0].id);
      }
      setLoading(false);
    })();
  }, [loadCompetitors]);

  async function handleSelectProperty(id: string) {
    setSelectedId(id);
    await loadCompetitors(id);
  }

  async function handleEnrich(id: string) {
    const comp = competitors.find(c => c.id === id);
    if (!comp || !email) return;

    // Optimistically mark as loading by temporarily setting property_name to a sentinel
    setCompetitors(prev =>
      prev.map(c => c.id === id ? { ...c, property_name: "…" } : c)
    );

    try {
      const checkRes = await fetch("/api/competitors/check-specials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: comp.address ?? comp.name, city: "", state: "" }),
      });
      const checkJson = await checkRes.json();

      const property_name: string | null = checkJson.property_name ?? null;
      const website_url:   string | null = checkJson.website_url   ?? comp.website_url ?? null;
      const concession:    string | null = checkJson.concession    ?? comp.concession  ?? null;

      await authFetch("/api/competitors", {
        method: "PATCH",
        body: { id, property_name, website_url, concession },
      });

      setCompetitors(prev =>
        prev.map(c =>
          c.id === id
            ? { ...c, property_name: property_name ?? null, website_url, concession }
            : c
        )
      );
    } catch {
      // Revert sentinel on error
      setCompetitors(prev =>
        prev.map(c => c.id === id ? { ...c, property_name: null } : c)
      );
    }
  }

  async function handleDelete(id: string) {
    await authFetch(`/api/competitors?id=${id}`, { method: "DELETE" });
    setCompetitors(prev => prev.filter(c => c.id !== id));
  }

  function handleSaved(comp: Competitor, isNew: boolean) {
    if (isNew) {
      setCompetitors(prev => [...prev, comp]);
    } else {
      setCompetitors(prev => prev.map(c => c.id === comp.id ? comp : c));
    }
    setEditing(null);
  }

  const selectedProperty = properties.find(p => p.id === selectedId);
  const ourRent          = avgRentByProperty[selectedId] ?? null;

  const compMids  = competitors.map(mid);
  const marketAvg = compMids.length > 0 ? Math.round(compMids.reduce((a, b) => a + b, 0) / compMids.length) : null;
  const gap       = ourRent && marketAvg ? ourRent - marketAvg : null;

  const highThreats = competitors.filter(c => c.threat_level === "high").length;
  const concessions = competitors.filter(c => c.concession).length;

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#0E1017]">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C8102E]" />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0E1017]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Competitor Intel</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track price position, concessions, and vacancy pressure — per property</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDiscover(true)}
              disabled={!selectedId}
              className="rounded-xl border border-[#C8102E] bg-[#C8102E]/10 px-4 py-2.5 text-sm font-bold text-[#C8102E] hover:bg-[#C8102E]/20 disabled:opacity-40 transition-colors">
              ✦ Discover
            </button>
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              disabled={properties.length === 0}
              className="rounded-xl bg-[#C8102E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
              + Add
            </button>
          </div>
        </div>

        {/* Property Tabs */}
        {properties.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-1">
              {properties.map(p => {
                const isActive = p.id === selectedId;
                return (
                  <button key={p.id} onClick={() => handleSelectProperty(p.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border transition-colors ${
                      isActive
                        ? "bg-[#C8102E] text-white border-[#C8102E]"
                        : "bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300"
                    }`}>
                    {p.name}
                    {isActive && competitors.length > 0 && (
                      <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{competitors.length}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {compLoading ? (
          <div className="flex items-center justify-center py-24">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[#C8102E]" />
          </div>
        ) : competitors.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1F2E] py-20 text-center">
            <p className="text-4xl mb-3">🏢</p>
            <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">No competitors tracked for {selectedProperty?.name}</p>
            <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
              Discover nearby properties automatically from Rentcast, or add one manually.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button onClick={() => setShowDiscover(true)}
                className="rounded-xl border border-[#C8102E] bg-[#C8102E]/10 px-6 py-2.5 text-sm font-bold text-[#C8102E] hover:bg-[#C8102E]/20 transition-colors">
                ✦ Discover Nearby
              </button>
              <button onClick={() => { setEditing(null); setShowModal(true); }}
                className="rounded-xl border border-gray-200 dark:border-white/10 px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                + Add Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Position Banner */}
            {ourRent && marketAvg && gap !== null && (
              <div className={`rounded-2xl border p-5 ${
                Math.abs(gap) <= 50
                  ? "border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-900/10"
                  : gap > 50
                  ? "border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-900/10"
                  : "border-blue-200 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-900/10"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Price Position — {selectedProperty?.name}</p>
                    <p className={`text-3xl font-black ${
                      Math.abs(gap) <= 50 ? "text-green-700 dark:text-green-400" :
                      gap > 50 ? "text-amber-700 dark:text-amber-400" : "text-blue-700 dark:text-blue-400"
                    }`}>
                      {gap === 0 ? "At market" : gap > 0 ? `${fmt(gap)} above market` : `${fmt(Math.abs(gap))} below market`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Your avg: <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(ourRent)}/mo</span>
                      {" · "}Comp avg: <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(marketAvg)}/mo</span>
                      {highThreats > 0 && <span className="ml-2 text-red-500 font-semibold">· {highThreats} high-threat comp{highThreats > 1 ? "s" : ""}</span>}
                      {concessions > 0 && <span className="ml-2 text-amber-500 font-semibold">· {concessions} running specials</span>}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Three intel panels */}
            <div className="grid gap-4 lg:grid-cols-3">
              {ourRent && <PriceLadder competitors={competitors} ourRent={ourRent} ourName={selectedProperty?.name ?? "Ours"} />}
              <ConcessionBoard competitors={competitors} />
              <VacancySignal competitors={competitors} />
            </div>

            {/* Competitor Cards */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                {competitors.length} Competitor{competitors.length !== 1 ? "s" : ""} Tracked
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[...competitors]
                  .sort((a, b) => {
                    const order = { high: 0, medium: 1, low: 2 };
                    return order[a.threat_level] - order[b.threat_level];
                  })
                  .map(c => (
                    <CompetitorCard
                      key={c.id}
                      comp={c}
                      ourRent={ourRent ?? 0}
                      onEdit={comp => { setEditing(comp); setShowModal(true); }}
                      onDelete={handleDelete}
                      onEnrich={handleEnrich}
                    />
                  ))}
              </div>
            </div>

            {/* Footer note */}
            <p className="text-center text-[11px] text-gray-400 pb-2">
              Update your competitors whenever you check their listings — staleness warnings appear after 7 days.
            </p>
          </div>
        )}
      </div>

      {showDiscover && selectedId && (
        <DiscoverModal
          propertyId={selectedId}
          propertyName={selectedProperty?.name ?? ""}
          email={email}
          onClose={() => setShowDiscover(false)}
          onAdded={comp => setCompetitors(prev => [...prev, comp])}
        />
      )}

      {showModal && (
        <CompetitorModal
          properties={properties}
          defaultPropertyId={selectedId}
          email={email}
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
