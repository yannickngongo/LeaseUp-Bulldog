"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone_number: string;
  active_special?: string;
  total_units?: number | null;
  occupied_units?: number | null;
  neighborhood?: string;
  website_url?: string;
  tour_booking_url?: string;
}

interface Lead {
  id: string;
  name: string;
  source?: string;
  status: string;
  ai_score?: number | null;
  created_at: string;
  updated_at: string;
  last_contacted_at?: string | null;
}

interface Unit {
  id?: string;
  unit_name: string;
  unit_type: string | null;
  bedrooms: number | null;
  sq_ft: number | null;
  status: string;
  current_resident: string;
  lease_start?: string;
  lease_end: string;
  monthly_rent: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const LEAD_STATUSES = ["new", "contacted", "engaged", "tour_scheduled", "applied", "won", "lost"];

function isTourOrBeyond(status: string) {
  return ["tour_scheduled", "applied", "won"].includes(status);
}
function isAppliedOrBeyond(status: string) {
  return ["applied", "won"].includes(status);
}

const STATUS_COLORS: Record<string, string> = {
  occupied:    "bg-green-100 text-green-700",
  vacant:      "bg-gray-100 text-gray-600",
  notice:      "bg-amber-100 text-amber-700",
  unavailable: "bg-red-100 text-red-600",
};

const LEAD_STATUS_LABEL: Record<string, string> = {
  new:             "New",
  contacted:       "Contacted",
  engaged:         "Engaged",
  tour_scheduled:  "Tour Scheduled",
  applied:         "Applied",
  won:             "Won",
  lost:            "Lost",
};

// ─── MetricCell ───────────────────────────────────────────────────────────────

function MetricCell({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Rent Roll Section ────────────────────────────────────────────────────────

function parseRentRollCsv(raw: string): Unit[] {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  const col = (row: string[], name: string) => {
    const idx = headers.findIndex(h => h.includes(name));
    return idx >= 0 ? (row[idx] ?? "").trim().replace(/"/g, "") : "";
  };
  return lines.slice(1).map(line => {
    const row = line.split(",");
    const unit_name = col(row, "unit");
    if (!unit_name) return null;
    const sr = col(row, "status").toLowerCase();
    const status = sr.includes("occup") ? "occupied" : sr.includes("notice") ? "notice" : sr.includes("unavail") ? "unavailable" : "vacant";
    const tr = col(row, "type").toLowerCase();
    const unit_type = tr.includes("studio") ? "studio" : tr.includes("4") ? "4br" : tr.includes("3") ? "3br" : tr.includes("2") ? "2br" : tr.includes("1") ? "1br" : tr || null;
    const bedsRaw = col(row, "bed");
    const sqftRaw = col(row, "sq") || col(row, "sqft") || col(row, "size");
    const rentRaw = col(row, "rent") || col(row, "price") || col(row, "amount");
    return {
      unit_name, unit_type,
      bedrooms: bedsRaw ? parseInt(bedsRaw, 10) || null : null,
      sq_ft: sqftRaw ? parseInt(sqftRaw.replace(/\D/g, ""), 10) || null : null,
      status,
      current_resident: col(row, "resident") || col(row, "tenant") || col(row, "name"),
      lease_end: col(row, "lease end") || col(row, "end date") || col(row, "move out"),
      monthly_rent: rentRaw ? parseInt(rentRaw.replace(/[^0-9]/g, ""), 10) || null : null,
    } as Unit;
  }).filter(Boolean) as Unit[];
}

function RentRollSection({ propertyId }: { propertyId: string }) {
  const [units, setUnits]           = useState<Unit[]>([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [parsing, setParsing]       = useState(false);
  const [csvText, setCsvText]       = useState("");
  const [preview, setPreview]       = useState<Unit[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [addError, setAddError]     = useState("");
  const [uploadMsg, setUploadMsg]   = useState("");

  const [newUnit, setNewUnit] = useState<Unit>({
    unit_name: "", unit_type: "", bedrooms: null, sq_ft: null,
    status: "vacant", current_resident: "", lease_end: "", monthly_rent: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/properties/${propertyId}/units`);
    if (res.ok) {
      const json = await res.json();
      setUnits(json.units ?? []);
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  function handleCsvChange(text: string) {
    setCsvText(text);
    setPreview(parseRentRollCsv(text));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const isCsv = file.name.toLowerCase().endsWith(".csv");

    if (!isPdf && !isCsv) { setUploadMsg("Only PDF or CSV files are supported."); return; }

    if (isCsv) {
      const text = await file.text();
      handleCsvChange(text);
      setUploadMsg("");
      return;
    }

    setParsing(true);
    setUploadMsg("Reading PDF with AI… this may take 10–20 seconds.");
    setPreview([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/properties/${propertyId}/parse-rent-roll`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && Array.isArray(data.units)) {
        setPreview(data.units);
        setUploadMsg(`AI extracted ${data.units.length} units from the PDF. Review and save.`);
      } else {
        setUploadMsg(data.error ?? "Failed to read PDF. Try exporting as CSV instead.");
      }
    } catch {
      setUploadMsg("Network error reading PDF. Try again.");
    } finally {
      setParsing(false);
    }
  }

  async function submitCsv() {
    if (preview.length === 0) return;
    setUploading(true);
    setUploadMsg("");
    const res = await fetch(`/api/properties/${propertyId}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ units: preview }),
    });
    if (res.ok) {
      setUploadMsg(`${preview.length} units saved. Occupancy updated.`);
      setCsvText(""); setPreview([]);
      setShowUpload(false);
      await load();
    } else {
      const j = await res.json();
      setUploadMsg(j.error ?? "Upload failed");
    }
    setUploading(false);
  }

  async function submitNewUnit() {
    if (!newUnit.unit_name.trim()) { setAddError("Unit name is required"); return; }
    setAddError("");
    const res = await fetch(`/api/properties/${propertyId}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ units: [newUnit] }),
    });
    if (res.ok) {
      setNewUnit({ unit_name: "", unit_type: "", bedrooms: null, sq_ft: null, status: "vacant", current_resident: "", lease_end: "", monthly_rent: null });
      setShowAdd(false);
      await load();
    } else {
      const j = await res.json();
      setAddError(j.error ?? "Failed to save unit");
    }
  }

  const occupied = units.filter(u => u.status === "occupied").length;
  const vacant   = units.filter(u => u.status === "vacant").length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Rent Roll & Occupancy</SectionLabel>
        <div className="flex gap-2">
          <button onClick={() => { setShowAdd(a => !a); setShowUpload(false); }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">
            + Add Unit
          </button>
          <button onClick={() => { setShowUpload(u => !u); setShowAdd(false); }}
            className="rounded-lg bg-[#C8102E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A50D25]">
            Upload Rent Roll
          </button>
        </div>
      </div>

      {units.length > 0 && (
        <div className="mb-4 flex gap-4">
          {[
            { label: "Total Units", value: units.length },
            { label: "Occupied", value: occupied, color: "text-green-600" },
            { label: "Vacant", value: vacant, color: "text-amber-600" },
            { label: "Occupancy", value: `${Math.round((occupied / units.length) * 100)}%`, color: occupied / units.length >= 0.9 ? "text-green-600" : "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="text-[10px] font-medium text-gray-400">{s.label}</p>
              <p className={cn("mt-0.5 text-lg font-bold text-gray-900 dark:text-gray-100", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">Add a Unit</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Unit Name *</label>
              <input value={newUnit.unit_name} onChange={e => setNewUnit(p => ({...p, unit_name: e.target.value}))}
                placeholder="e.g. 101A" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
              <select value={newUnit.unit_type ?? ""} onChange={e => setNewUnit(p => ({...p, unit_type: e.target.value}))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1C1F2E] dark:text-gray-300">
                <option value="">—</option>
                <option value="studio">Studio</option>
                <option value="1br">1 BR</option>
                <option value="2br">2 BR</option>
                <option value="3br">3 BR</option>
                <option value="4br">4 BR</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
              <select value={newUnit.status} onChange={e => setNewUnit(p => ({...p, status: e.target.value}))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1C1F2E] dark:text-gray-300">
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="notice">Notice</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Current Resident</label>
              <input value={newUnit.current_resident} onChange={e => setNewUnit(p => ({...p, current_resident: e.target.value}))}
                placeholder="Full name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Monthly Rent ($)</label>
              <input type="number" value={newUnit.monthly_rent ?? ""} onChange={e => setNewUnit(p => ({...p, monthly_rent: e.target.value ? parseInt(e.target.value) : null}))}
                placeholder="1200" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Lease End Date</label>
              <input type="date" value={newUnit.lease_end} onChange={e => setNewUnit(p => ({...p, lease_end: e.target.value}))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100" />
            </div>
          </div>
          {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={submitNewUnit} className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A50D25]">Save Unit</button>
            <button onClick={() => setShowAdd(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {showUpload && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <p className="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-100">Upload Rent Roll</p>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Upload your rent roll PDF — AI reads it and extracts all units automatically.</p>

          <label className={cn(
            "mb-3 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            parsing ? "border-[#C8102E]/40 bg-[#C8102E]/5" : "border-gray-200 hover:border-[#C8102E]/40 dark:border-white/10"
          )}>
            <input type="file" accept=".pdf,.csv" className="hidden" onChange={handleFileUpload} disabled={parsing} />
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C8102E]/30 border-t-[#C8102E]" />
                <p className="text-sm font-semibold text-[#C8102E]">AI is reading your rent roll…</p>
                <p className="text-xs text-gray-400">This takes 15–30 seconds for large files</p>
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-[#C8102E]/10">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth={1.5} className="h-6 w-6">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Click to upload PDF or CSV</p>
                  <p className="text-xs text-gray-400 mt-0.5">Works with Yardi, AppFolio, RealPage, Entrata, MRI exports</p>
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="rounded-full bg-[#C8102E]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#C8102E]">PDF — AI reads it</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-white/10">CSV — instant parse</span>
                </div>
              </>
            )}
          </label>

          {preview.length > 0 && (() => {
            const occ     = preview.filter(u => u.status === "occupied").length;
            const vac     = preview.filter(u => u.status === "vacant").length;
            const ntv     = preview.filter(u => u.status === "notice").length;
            const unavail = preview.filter(u => u.status === "unavailable").length;
            return (
              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
                <p className="mb-3 text-xs font-semibold text-gray-700 dark:text-gray-200">AI extracted {preview.length} units — review before saving</p>
                <div className="mb-3 grid grid-cols-4 gap-2">
                  {[
                    { label: "Total", value: preview.length, color: "text-gray-900 dark:text-white" },
                    { label: "Occupied", value: occ, color: "text-green-600" },
                    { label: "Vacant", value: vac, color: "text-amber-600" },
                    { label: "Notice/Other", value: ntv + unavail, color: "text-red-500" },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-2 text-center dark:border-white/10 dark:bg-white/5">
                      <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                      <p className="text-[10px] text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-[10px] text-gray-400">
                    <span>Occupancy</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round((occ / preview.length) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.round((occ / preview.length) * 100)}%` }} />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-gray-400 sticky top-0 bg-gray-50 dark:bg-[#1C1F2E]">
                      <th className="pb-1.5 pr-3">Unit</th><th className="pb-1.5 pr-3">Status</th>
                      <th className="pb-1.5 pr-3">Type</th><th className="pb-1.5 pr-3">Resident</th><th className="pb-1.5">Rent</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {preview.map((u, i) => (
                        <tr key={i}>
                          <td className="py-1 pr-3 font-medium text-gray-900 dark:text-gray-100">{u.unit_name}</td>
                          <td className="py-1 pr-3"><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize", STATUS_COLORS[u.status] ?? "bg-gray-100 text-gray-600")}>{u.status}</span></td>
                          <td className="py-1 pr-3 text-gray-500">{u.unit_type || "—"}</td>
                          <td className="py-1 pr-3 text-gray-500">{u.current_resident || "—"}</td>
                          <td className="py-1 text-gray-500">{u.monthly_rent ? `$${u.monthly_rent.toLocaleString()}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {uploadMsg && (
            <p className={cn("mt-2 text-xs font-medium", uploadMsg.includes("saved") || uploadMsg.includes("extracted") ? "text-green-600" : uploadMsg.includes("AI is") ? "text-[#C8102E]" : "text-red-600")}>
              {uploadMsg}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button onClick={submitCsv} disabled={uploading || preview.length === 0}
              className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A50D25] disabled:opacity-50">
              {uploading ? "Saving…" : `Save ${preview.length || ""} Units`}
            </button>
            <button onClick={() => { setShowUpload(false); setCsvText(""); setPreview([]); setUploadMsg(""); }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      <Card padding="none">
        {loading ? (
          <div className="p-5 text-sm text-gray-400">Loading units…</div>
        ) : units.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No units on file yet.</p>
            <p className="text-xs text-gray-400">Upload a rent roll or add units manually.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 dark:border-white/5 text-left">
              {["Unit", "Status", "Type", "Resident", "Rent", "Lease End"].map(h => (
                <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {units.map((u, i) => (
                <tr key={u.id ?? i} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{u.unit_name}</td>
                  <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", STATUS_COLORS[u.status] ?? "bg-gray-100 text-gray-600")}>{u.status}</span></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.unit_type ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{u.current_resident || "—"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{u.monthly_rent ? `$${u.monthly_rent.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.lease_end || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertyDetailPage() {
  const params     = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [propRes, leadsRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}/details`),
        fetch(`/api/leads?propertyId=${propertyId}`),
      ]);
      if (propRes.ok)  { const j = await propRes.json();  setProperty(j.property ?? null); }
      if (leadsRes.ok) { const j = await leadsRes.json(); setLeads(j.leads ?? []); }
      setLoading(false);
    }
    load();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        {[1,2,3].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
        ))}
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Property not found</p>
        <Link href="/properties" className="mt-3 text-sm text-[#C8102E] hover:underline">← Back to Properties</Link>
      </div>
    );
  }

  // ── Derived stats ────────────────────────────────────────────────────────────

  const activeLeads  = leads.filter(l => !["won","lost"].includes(l.status));
  const tourLeads    = leads.filter(l => isTourOrBeyond(l.status));
  const appliedLeads = leads.filter(l => isAppliedOrBeyond(l.status));
  const wonLeads     = leads.filter(l => l.status === "won");

  const totalUnits   = property.total_units ?? 0;
  const occupiedUnits = property.occupied_units ?? 0;
  const occPct       = totalUnits > 0 ? pct(occupiedUnits, totalUnits) : null;
  const availUnits   = totalUnits > 0 ? totalUnits - occupiedUnits : null;

  // Average rent from leads budget (rough proxy — rent roll is more accurate)
  const avgScore = leads.filter(l => l.ai_score != null).length > 0
    ? (leads.reduce((s, l) => s + (l.ai_score ?? 0), 0) / leads.filter(l => l.ai_score != null).length).toFixed(1)
    : "—";

  // ── Funnel ───────────────────────────────────────────────────────────────────

  const funnel = [
    { label: "Leads",        value: activeLeads.length },
    { label: "Tours",        value: tourLeads.length },
    { label: "Applications", value: appliedLeads.length },
    { label: "Move-ins",     value: wonLeads.length },
  ];
  const funnelMax = funnel[0].value || 1;

  // ── Lead sources ─────────────────────────────────────────────────────────────

  const sourceMap: Record<string, { leads: number; tours: number; apps: number; move_ins: number }> = {};
  for (const l of leads) {
    const src = l.source || "Unknown";
    if (!sourceMap[src]) sourceMap[src] = { leads: 0, tours: 0, apps: 0, move_ins: 0 };
    sourceMap[src].leads++;
    if (isTourOrBeyond(l.status))    sourceMap[src].tours++;
    if (isAppliedOrBeyond(l.status)) sourceMap[src].apps++;
    if (l.status === "won")          sourceMap[src].move_ins++;
  }
  const sources = Object.entries(sourceMap)
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.move_ins - a.move_ins || b.leads - a.leads);

  // ── Dynamic issues ───────────────────────────────────────────────────────────

  const issues: { type: "critical" | "warning" | "opportunity"; title: string; body: string; href?: string }[] = [];

  if (occPct !== null && occPct < 80) {
    issues.push({
      type: "critical",
      title: `Low occupancy (${occPct}%)`,
      body: `Only ${occupiedUnits} of ${totalUnits} units are occupied. Upload a fresh rent roll if this looks outdated, or focus leasing efforts on converting current leads to applications.`,
      href: `/leads?propertyId=${propertyId}`,
    });
  } else if (occPct !== null && occPct < 90) {
    issues.push({
      type: "warning",
      title: `Occupancy below 90% (${occPct}%)`,
      body: `You have ${availUnits} available ${availUnits === 1 ? "unit" : "units"}. Industry target is 95%+. Review your pipeline to see which leads are closest to converting.`,
      href: `/leads?propertyId=${propertyId}`,
    });
  }

  const staleNew = leads.filter(l => {
    if (l.status !== "new") return false;
    return Date.now() - new Date(l.created_at).getTime() > 24 * 60 * 60 * 1000;
  });
  if (staleNew.length > 0) {
    issues.push({
      type: "critical",
      title: `${staleNew.length} new ${staleNew.length === 1 ? "lead" : "leads"} without a reply`,
      body: `${staleNew.map(l => l.name).slice(0,3).join(", ")}${staleNew.length > 3 ? ` and ${staleNew.length - 3} more` : ""} ${staleNew.length === 1 ? "has" : "have"} not received a reply yet. Speed of response directly impacts tour rates.`,
      href: `/leads?propertyId=${propertyId}&status=new`,
    });
  }

  const staleContacted = leads.filter(l => {
    if (!["contacted","engaged"].includes(l.status)) return false;
    const lastTouch = l.last_contacted_at ?? l.updated_at;
    return Date.now() - new Date(lastTouch).getTime() > 3 * 24 * 60 * 60 * 1000;
  });
  if (staleContacted.length > 0) {
    issues.push({
      type: "warning",
      title: `${staleContacted.length} leads silent for 3+ days`,
      body: `${staleContacted.map(l => l.name).slice(0,3).join(", ")}${staleContacted.length > 3 ? ` and ${staleContacted.length - 3} more` : ""} ${staleContacted.length === 1 ? "hasn't" : "haven't"} engaged in over 3 days. A follow-up now can recover these leads.`,
      href: `/leads?propertyId=${propertyId}`,
    });
  }

  if (tourLeads.length > 0 && appliedLeads.length === 0) {
    issues.push({
      type: "warning",
      title: "No applications from toured leads",
      body: `You have ${tourLeads.length} leads who have toured but none have started an application. Consider sending the application link immediately after each tour.`,
      href: `/leads?propertyId=${propertyId}`,
    });
  }

  if (wonLeads.length > 0 && issues.length === 0) {
    issues.push({
      type: "opportunity",
      title: `${wonLeads.length} move-in${wonLeads.length > 1 ? "s" : ""} this cycle`,
      body: "Great conversion! Your pipeline is healthy. Consider asking new residents for referrals — referrals typically convert at 3× the rate of cold leads at $0 cost.",
    });
  }

  if (issues.length === 0 && activeLeads.length === 0) {
    issues.push({
      type: "opportunity",
      title: "No active leads right now",
      body: "Your pipeline is empty. Make sure your AI phone number is published on your listing sites to start capturing inbound leads automatically.",
    });
  }

  // ── Recent activity (latest 8 leads by updated_at) ───────────────────────────

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8);

  const ISSUE_STYLES = {
    critical:    { bar: "bg-red-500",   badge: "bg-red-50 text-red-700",     icon: "✕", label: "Critical" },
    warning:     { bar: "bg-amber-400", badge: "bg-amber-50 text-amber-700", icon: "⚠", label: "Warning" },
    opportunity: { bar: "bg-blue-400",  badge: "bg-blue-50 text-blue-700",   icon: "→", label: "Opportunity" },
  };

  const criticalCount = issues.filter(i => i.type === "critical").length;

  return (
    <div className="space-y-8 p-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-400">
          <Link href="/properties" className="hover:text-gray-700 transition-colors dark:hover:text-gray-300">Properties</Link>
          <span>/</span>
          <span className="text-gray-600 dark:text-gray-300">{property.name}</span>
        </div>

        <div className="flex flex-wrap items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{property.name}</h1>
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                Active
              </span>
              {criticalCount > 0 && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {criticalCount} critical {criticalCount === 1 ? "issue" : "issues"}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {property.address} · {property.city}, {property.state} {property.zip}
            </p>
            {property.active_special && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                Special: {property.active_special}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {occPct !== null && (
              <div className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                <p className="text-[10px] font-medium text-gray-400">Occupancy</p>
                <p className={cn("mt-0.5 text-sm font-bold", occPct >= 90 ? "text-green-600" : occPct >= 78 ? "text-amber-600" : "text-red-500")}>
                  {occPct}%
                </p>
              </div>
            )}
            {availUnits !== null && (
              <div className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                <p className="text-[10px] font-medium text-gray-400">Available</p>
                <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">{availUnits} units</p>
              </div>
            )}
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="text-[10px] font-medium text-gray-400">Active Leads</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">{activeLeads.length}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
              <p className="text-[10px] font-medium text-gray-400">AI Number</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-gray-900 dark:text-gray-100">{property.phone_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/leads?propertyId=${propertyId}`}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
              View Leads
            </Link>
            <Link href={`/properties/${propertyId}/edit`}
              className="rounded-lg bg-[#C8102E] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#A50D25]">
              Edit Property
            </Link>
          </div>
        </div>
      </div>

      {/* ── Pipeline KPIs ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Pipeline Overview</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCell label="Active Leads"    value={activeLeads.length}   sub="in pipeline" />
          <MetricCell label="Tours Scheduled" value={tourLeads.length}     sub={`${pct(tourLeads.length, activeLeads.length || 1)}% tour rate`} />
          <MetricCell label="Applications"    value={appliedLeads.length}  sub={`${pct(appliedLeads.length, tourLeads.length || 1)}% of toured`} />
          <MetricCell label="Move-ins"        value={wonLeads.length}      sub={`${pct(wonLeads.length, activeLeads.length || 1)}% close rate`} />
        </div>
      </div>

      {/* ── Conversion Funnel ───────────────────────────────────────────── */}
      {activeLeads.length > 0 && (
        <div>
          <SectionLabel>Conversion Funnel</SectionLabel>
          <Card padding="none">
            <div className="flex divide-x divide-gray-50 dark:divide-white/5">
              {funnel.map((stage, i) => {
                const widthPct = pct(stage.value, funnelMax);
                const convPct  = i === 0 ? 100 : pct(stage.value, funnel[i - 1].value || 1);
                const isWeak   = i > 0 && convPct < 40 && funnel[i-1].value > 0;
                return (
                  <div key={stage.label} className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 dark:bg-white/10">{i + 1}</span>
                      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{stage.label}</p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div className={cn("h-full rounded-full", isWeak ? "bg-red-400" : "bg-[#C8102E]")} style={{ width: `${widthPct}%` }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stage.value}</p>
                    </div>
                    {i > 0 && funnel[i-1].value > 0 && (
                      <div className={cn("mt-auto rounded-lg px-2 py-1 text-center text-[10px] font-semibold", isWeak ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400")}>
                        {convPct}% from prev
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Lead Source Performance ─────────────────────────────────────── */}
      {sources.length > 0 && (
        <div>
          <SectionLabel>Lead Source Performance</SectionLabel>
          <Card padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  {["Source", "Leads", "Tours", "Tour Rate", "Apps", "Move-ins", "Conv. Rate"].map((h) => (
                    <th key={h} className={cn("px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400", h === "Source" ? "text-left" : "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {sources.map((src) => {
                  const tourRate = pct(src.tours, src.leads);
                  const convRate = pct(src.move_ins, src.leads);
                  const isTop    = src.move_ins === Math.max(...sources.map(s => s.move_ins)) && src.move_ins > 0;
                  const isDead   = src.move_ins === 0 && src.leads >= 5;
                  return (
                    <tr key={src.name} className="hover:bg-gray-50/60 dark:hover:bg-white/3">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{src.name}</span>
                          {isTop && <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">Top source</span>}
                          {isDead && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">0 move-ins</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-700 dark:text-gray-300">{src.leads}</td>
                      <td className="px-5 py-3.5 text-right text-gray-700 dark:text-gray-300">{src.tours}</td>
                      <td className={cn("px-5 py-3.5 text-right font-medium", tourRate >= 35 ? "text-green-600" : tourRate < 20 && src.leads >= 3 ? "text-red-500" : "text-gray-700 dark:text-gray-300")}>{tourRate}%</td>
                      <td className="px-5 py-3.5 text-right text-gray-700 dark:text-gray-300">{src.apps}</td>
                      <td className="px-5 py-3.5 text-right"><span className={cn("font-semibold", src.move_ins > 0 ? "text-gray-900 dark:text-gray-100" : "text-gray-400")}>{src.move_ins}</span></td>
                      <td className={cn("px-5 py-3.5 text-right font-semibold", convRate >= 8 ? "text-green-600" : convRate === 0 && src.leads >= 5 ? "text-red-500" : "text-gray-700 dark:text-gray-300")}>{convRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── Issues & Opportunities ──────────────────────────────────────── */}
      {issues.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>Issues & Opportunities</SectionLabel>
            <span className="text-xs text-gray-400">
              {criticalCount > 0 && `${criticalCount} critical · `}
              {issues.filter(i => i.type === "warning").length > 0 && `${issues.filter(i => i.type === "warning").length} warnings · `}
              {issues.filter(i => i.type === "opportunity").length} opportunities
            </span>
          </div>
          <div className="space-y-3">
            {issues.map((issue, i) => {
              const s = ISSUE_STYLES[issue.type];
              return (
                <div key={i} className="relative flex gap-4 overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                  <div className={cn("absolute bottom-0 left-0 top-0 w-1", s.bar)} />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", s.badge)}>{s.icon} {s.label}</span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{issue.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{issue.body}</p>
                    {issue.href && (
                      <Link href={issue.href} className="mt-3 inline-block text-xs font-medium text-[#C8102E] hover:underline">
                        View leads →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Rent Roll & Occupancy ───────────────────────────────────────── */}
      <RentRollSection propertyId={propertyId} />

      {/* ── Recent Lead Activity ────────────────────────────────────────── */}
      {recentLeads.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>Recent Lead Activity</SectionLabel>
            <Link href={`/leads?propertyId=${propertyId}`} className="text-xs font-medium text-[#C8102E] hover:underline">
              View all leads →
            </Link>
          </div>
          <Card padding="none">
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-white/3 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{lead.name}</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-400 capitalize">
                        {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
                      </span>
                      {lead.source && (
                        <span className="text-[11px] text-gray-400">{lead.source}</span>
                      )}
                    </div>
                    {lead.ai_score != null && (
                      <p className="mt-0.5 text-xs text-gray-500">AI score: {lead.ai_score}/10</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(lead.updated_at)}</span>
                  <Link href={`/leads?lead=${lead.id}`} className="shrink-0 text-[11px] font-medium text-gray-400 transition-colors hover:text-[#C8102E]">
                    Open →
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
