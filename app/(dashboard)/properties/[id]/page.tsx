"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadSource {
  name: string;
  leads: number;
  tours: number;
  apps: number;
  move_ins: number;
  cost_per_lead?: number;
}

interface FunnelStage {
  label: string;
  value: number;
  pct_of_top?: number;
  note?: string;
}

interface Issue {
  type: "warning" | "critical" | "opportunity";
  title: string;
  body: string;
  action?: string;
  href?: string;
}

interface Activity {
  id: string;
  lead: string;
  event: string;
  actor: "AI" | "Lead" | "System" | "Agent";
  time: string;
  status?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const PROPERTY = {
  id: "prop-1",
  name: "The Monroe",
  address: "3740 Desert Rose Blvd",
  city: "Las Vegas",
  state: "NV",
  zip: "89101",
  units: 48,
  occupied: 43,
  ai_number: "+1 (702) 555-0100",
  manager: "Marcus Thompson",
  active_special: "1 month free on 12-month leases",
  avg_rent: 1_485,
};

const FUNNEL: FunnelStage[] = [
  { label: "Leads",                  value: 64 },
  { label: "Tours",                  value: 18, note: "28% tour rate" },
  { label: "Applications Started",   value: 9,  note: "50% of toured" },
  { label: "Applications Completed", value: 5,  note: "56% completion" },
  { label: "Move-ins",               value: 3,  note: "60% of completed" },
];

const SOURCES: LeadSource[] = [
  { name: "Zillow",   leads: 24, tours: 9,  apps: 4, move_ins: 2, cost_per_lead: 32 },
  { name: "Website",  leads: 18, tours: 5,  apps: 3, move_ins: 1, cost_per_lead: 0  },
  { name: "Facebook", leads: 12, tours: 2,  apps: 1, move_ins: 0, cost_per_lead: 18 },
  { name: "ILS",      leads: 7,  tours: 1,  apps: 0, move_ins: 0, cost_per_lead: 41 },
  { name: "Referral", leads: 3,  tours: 1,  apps: 1, move_ins: 1, cost_per_lead: 0  },
];

const PERF = [
  { label: "Avg. First Response",     value: "1m 08s",  benchmark: "< 5 min",  good: true  },
  { label: "Follow-up Completion",    value: "84%",     benchmark: "> 80%",    good: true  },
  { label: "No-Show Rate",            value: "22%",     benchmark: "< 15%",    good: false },
  { label: "Application Completion",  value: "56%",     benchmark: "> 70%",    good: false },
  { label: "Avg. AI Lead Score",      value: "6.4 / 10", benchmark: "> 6.0",   good: true  },
  { label: "Tour → App Rate",         value: "50%",     benchmark: "> 55%",    good: false },
];

const ISSUES: Issue[] = [
  {
    type: "critical",
    title: "High no-show rate (22%)",
    body: "1 in 5 tours is resulting in a no-show. The AI reminder is running 24h in advance — consider adding a 2-hour day-of reminder to reduce drop-off.",
    action: "Edit automation",
    href: "/automations",
  },
  {
    type: "warning",
    title: "Application drop-off after tour",
    body: "Only 9 of 18 toured leads have started an application (50%). The industry average is 65%. Consider sending the application link immediately after tour completion.",
    action: "Create nudge",
    href: "/automations",
  },
  {
    type: "critical",
    title: "5 applications stalled > 5 days",
    body: "Jordan Ellis, Priya Sharma, and 3 others started applications but haven't completed them. The application nudge automation is in Draft — publish it to recover these leads.",
    action: "View leads",
    href: "/leads?property=prop-1&status=applied",
  },
  {
    type: "warning",
    title: "Facebook ROI is negative",
    body: "Facebook-sourced leads have a 17% tour rate and 0 move-ins this month vs. $18 cost-per-lead. Zillow is converting 4× better at $32 CPL. Consider reallocating budget.",
  },
  {
    type: "opportunity",
    title: "Referral channel outperforming",
    body: "Referrals convert to move-ins at 33% — the highest of any source. You have 3 current residents. A small referral incentive could meaningfully increase lead volume at $0 CPL.",
  },
];

const ACTIVITY: Activity[] = [
  { id: "a1", lead: "Jordan Ellis",   event: "Tour completed — no application yet",        actor: "System", time: "2h ago",  status: "tour_scheduled" },
  { id: "a2", lead: "Priya Sharma",   event: "AI sent follow-up: application reminder",    actor: "AI",     time: "4h ago" },
  { id: "a3", lead: "Carlos Reyes",   event: "Application started (step 1 of 4)",          actor: "Lead",   time: "6h ago",  status: "applied" },
  { id: "a4", lead: "Maya Thompson",  event: "Replied to AI: 'Can I reschedule my tour?'",  actor: "Lead",   time: "8h ago" },
  { id: "a5", lead: "Sofia Ruiz",     event: "New lead — AI replied in 48s",               actor: "AI",     time: "10h ago", status: "new" },
  { id: "a6", lead: "Derek Nguyen",   event: "Silent 11 days — flagged for manual review", actor: "System", time: "1d ago",  status: "contacted" },
  { id: "a7", lead: "Aisha Patel",    event: "Lease signed — move-in June 1",              actor: "Agent",  time: "2d ago",  status: "applied" },
  { id: "a8", lead: "Liam Chen",      event: "Tour reminder sent (24h in advance)",        actor: "AI",     time: "2d ago",  status: "tour_scheduled" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

const ACTOR_STYLES: Record<Activity["actor"], string> = {
  AI:     "bg-violet-50 text-violet-700",
  Lead:   "bg-blue-50 text-blue-700",
  System: "bg-gray-100 text-gray-600",
  Agent:  "bg-green-50 text-green-700",
};

const ISSUE_STYLES: Record<Issue["type"], { bar: string; icon: string; badge: string; badgeText: string }> = {
  critical:    { bar: "bg-red-500",   icon: "✕", badge: "bg-red-50 text-red-700",     badgeText: "Critical" },
  warning:     { bar: "bg-amber-400", icon: "⚠", badge: "bg-amber-50 text-amber-700", badgeText: "Warning" },
  opportunity: { bar: "bg-blue-400",  icon: "→", badge: "bg-blue-50 text-blue-700",   badgeText: "Opportunity" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────


function MetricCell({ label, value, good, benchmark }: { label: string; value: string; good: boolean; benchmark: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", good ? "text-gray-900" : "text-red-500")}>{value}</p>
      <p className={cn("mt-0.5 text-[11px]", good ? "text-green-600" : "text-gray-400")}>
        {good ? "✓" : "↓"} Benchmark: {benchmark}
      </p>
    </div>
  );
}

// ─── Rent Roll Section ────────────────────────────────────────────────────────

interface Unit {
  id?: string;
  unit_name: string;
  unit_type: string | null;
  bedrooms: number | null;
  sq_ft: number | null;
  status: string;
  current_resident: string;
  lease_end: string;
  monthly_rent: number | null;
}

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

const STATUS_COLORS: Record<string, string> = {
  occupied:    "bg-green-100 text-green-700",
  vacant:      "bg-gray-100 text-gray-600",
  notice:      "bg-amber-100 text-amber-700",
  unavailable: "bg-red-100 text-red-600",
};

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

    if (!isPdf && !isCsv) {
      setUploadMsg("Only PDF or CSV files are supported.");
      return;
    }

    if (isCsv) {
      // Fast client-side parse for CSV
      const text = await file.text();
      handleCsvChange(text);
      setUploadMsg("");
      return;
    }

    // PDF: send to server — Claude reads it
    setParsing(true);
    setUploadMsg("Reading PDF with AI… this may take 10–20 seconds.");
    setPreview([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/properties/${propertyId}/parse-rent-roll`, {
        method: "POST",
        body: fd,
      });
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

      {/* Stats bar */}
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

      {/* Add unit form */}
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

      {/* Upload panel */}
      {showUpload && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <p className="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-100">Upload Rent Roll</p>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Upload your rent roll PDF — AI reads it and extracts all units, occupancy status, residents, and rents automatically.</p>

          {/* PDF drop zone — primary */}
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

          {/* Preview with occupancy summary */}
          {preview.length > 0 && (() => {
            const occ = preview.filter(u => u.status === "occupied").length;
            const vac = preview.filter(u => u.status === "vacant").length;
            const ntv = preview.filter(u => u.status === "notice").length;
            const unavail = preview.filter(u => u.status === "unavailable").length;
            return (
              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
                {/* Summary stats */}
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
                {/* Occupancy bar */}
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-[10px] text-gray-400">
                    <span>Occupancy</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round((occ / preview.length) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.round((occ / preview.length) * 100)}%` }} />
                  </div>
                </div>
                {/* Unit table */}
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-gray-400 sticky top-0 bg-gray-50 dark:bg-[#1C1F2E]">
                      <th className="pb-1.5 pr-3">Unit</th>
                      <th className="pb-1.5 pr-3">Status</th>
                      <th className="pb-1.5 pr-3">Type</th>
                      <th className="pb-1.5 pr-3">Resident</th>
                      <th className="pb-1.5">Rent</th>
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

      {/* Unit table */}
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

// ─── AI Configuration Section ─────────────────────────────────────────────────

function AIConfigSection() {
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    leasing_special_title:       "",
    leasing_special_description: "",
    pricing_notes:               "",
    application_link:            "",
    tour_instructions:           "",
    office_hours:                "",
    objection_handling_notes:    "",
    allowed_messaging:           "",
    disallowed_claims:           "",
    escalation_triggers:         "",
  });

  function handleChange(field: keyof typeof config, value: string) {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>AI Configuration</SectionLabel>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          The AI can ONLY reference what you define here. It will never invent pricing, specials, or policies.
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
        {/* What the AI can say */}
        <div className="border-b border-gray-100 px-6 py-5 dark:border-white/5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">What the AI can reference</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Current Special — Title</label>
              <input
                placeholder="e.g. 1 Month Free on 12-Month Leases"
                value={config.leasing_special_title}
                onChange={e => handleChange("leasing_special_title", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Current Special — Details</label>
              <input
                placeholder="e.g. Valid for move-ins before May 31"
                value={config.leasing_special_description}
                onChange={e => handleChange("leasing_special_description", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Pricing Notes</label>
              <input
                placeholder="e.g. 1BRs from $1,200, 2BRs from $1,500/mo"
                value={config.pricing_notes}
                onChange={e => handleChange("pricing_notes", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Application Link</label>
              <input
                type="url"
                placeholder="https://apply.mypropertyportal.com/..."
                value={config.application_link}
                onChange={e => handleChange("application_link", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Tour Instructions</label>
              <input
                placeholder="e.g. Tours Mon–Fri 9am–5pm, call to schedule"
                value={config.tour_instructions}
                onChange={e => handleChange("tour_instructions", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Office Hours</label>
              <input
                placeholder="e.g. Mon–Sat 9am–6pm, Sun 11am–4pm"
                value={config.office_hours}
                onChange={e => handleChange("office_hours", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Guardrails */}
        <div className="border-b border-gray-100 px-6 py-5 dark:border-white/5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Guardrails</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Allowed Messaging</label>
              <textarea
                rows={3}
                placeholder="What topics and messages the AI is allowed to discuss..."
                value={config.allowed_messaging}
                onChange={e => handleChange("allowed_messaging", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Disallowed Claims
                <span className="ml-1 text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Do not promise specific move-in dates. Do not quote concessions not listed above."
                value={config.disallowed_claims}
                onChange={e => handleChange("disallowed_claims", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Objection Handling Notes</label>
              <textarea
                rows={3}
                placeholder="e.g. If asked about pets: we allow cats and small dogs under 30lbs with a $300 deposit."
                value={config.objection_handling_notes}
                onChange={e => handleChange("objection_handling_notes", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Escalation Triggers
                <span className="ml-1.5 text-[10px] text-gray-400">(comma-separated)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. lease terms, eviction, legal, attorney, discrimination"
                value={config.escalation_triggers}
                onChange={e => handleChange("escalation_triggers", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                When a lead mentions these topics, AI stops and escalates to a human.
              </p>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Changes take effect on the next AI reply sent to any lead at this property.
          </p>
          <button
            onClick={() => setSaved(true)}
            className="rounded-lg bg-[#C8102E] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#A50D25]"
          >
            {saved ? "Saved ✓" : "Save AI Config"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertyDetailPage() {
  const params     = useParams();
  const propertyId = params.id as string;
  const occupied   = PROPERTY.occupied;
  const units      = PROPERTY.units;
  const available  = units - occupied;
  const occPct     = pct(occupied, units);
  const occColor   = occPct >= 90 ? "text-green-600" : occPct >= 78 ? "text-amber-600" : "text-red-500";

  const funnelMax = FUNNEL[0].value;
  const criticalCount = ISSUES.filter((i) => i.type === "critical").length;

  return (
    <div className="space-y-8 p-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        {/* Breadcrumb */}
        <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-400">
          <Link href="/properties" className="hover:text-gray-700 transition-colors">Properties</Link>
          <span>/</span>
          <span className="text-gray-600">{PROPERTY.name}</span>
        </div>

        <div className="flex flex-wrap items-start gap-6">
          {/* Identity */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{PROPERTY.name}</h1>
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                Active
              </span>
              {criticalCount > 0 && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                  {criticalCount} critical {criticalCount === 1 ? "issue" : "issues"}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {PROPERTY.address} · {PROPERTY.city}, {PROPERTY.state} {PROPERTY.zip}
            </p>
            {PROPERTY.active_special && (
              <p className="mt-1.5 text-xs text-amber-600">
                Special offer: {PROPERTY.active_special}
              </p>
            )}
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: "Occupancy",      value: `${occPct}%`,       valueClass: occColor },
              { label: "Available",      value: `${available} units` },
              { label: "Avg Rent",       value: `$${PROPERTY.avg_rent.toLocaleString()}` },
              { label: "AI Number",      value: PROPERTY.ai_number,  mono: true },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                <p className="text-[10px] font-medium text-gray-400">{s.label}</p>
                <p className={cn("mt-0.5 text-sm font-bold text-gray-900", s.valueClass, s.mono && "font-mono")}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <Link
              href={`/leads?property=${PROPERTY.id}`}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
              View Leads
            </Link>
            <Link
              href="/calendar"
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
              Calendar
            </Link>
            <button className="rounded-lg bg-[#C8102E] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#A50D25]">
              Edit Property
            </button>
          </div>
        </div>
      </div>

      {/* ── Conversion Funnel ───────────────────────────────────────────── */}
      <div>
        <SectionLabel>Conversion Funnel — This Month</SectionLabel>
        <Card padding="none">
          <div className="flex divide-x divide-gray-50">
            {FUNNEL.map((stage, i) => {
              const widthPct = pct(stage.value, funnelMax);
              const convPct  = i === 0 ? 100 : pct(stage.value, FUNNEL[i - 1].value);
              const isWeak   = i > 0 && convPct < 50;
              return (
                <div key={stage.label} className="flex flex-1 flex-col gap-3 p-5">
                  {/* Stage number */}
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                      {i + 1}
                    </span>
                    <p className="text-[11px] font-semibold text-gray-500">{stage.label}</p>
                  </div>

                  {/* Bar */}
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn("h-full rounded-full", isWeak ? "bg-red-400" : "bg-[#C8102E]")}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>

                  {/* Value */}
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stage.value}</p>
                    {stage.note && (
                      <p className={cn("mt-0.5 text-[11px]", isWeak ? "text-red-500" : "text-gray-400")}>
                        {stage.note}
                      </p>
                    )}
                  </div>

                  {/* Step conversion */}
                  {i > 0 && (
                    <div className={cn(
                      "mt-auto rounded-lg px-2 py-1 text-center text-[10px] font-semibold",
                      isWeak ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"
                    )}>
                      {convPct}% from prev
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Lead Source Performance ─────────────────────────────────────── */}
      <div>
        <SectionLabel>Lead Source Performance</SectionLabel>
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                {["Source", "Leads", "Tours", "Tour Rate", "Apps", "Move-ins", "Conv. Rate", "CPL"].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400",
                      h === "Source" ? "text-left" : "text-right"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {SOURCES.sort((a, b) => b.move_ins - a.move_ins).map((src) => {
                const tourRate   = pct(src.tours, src.leads);
                const convRate   = pct(src.move_ins, src.leads);
                const isTopSrc   = src.move_ins === Math.max(...SOURCES.map((s) => s.move_ins));
                const isDead     = src.move_ins === 0 && src.leads >= 7;
                return (
                  <tr key={src.name} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{src.name}</span>
                        {isTopSrc && (
                          <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                            Top source
                          </span>
                        )}
                        {isDead && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                            0 move-ins
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-700">{src.leads}</td>
                    <td className="px-5 py-3.5 text-right text-gray-700">{src.tours}</td>
                    <td className={cn("px-5 py-3.5 text-right font-medium", tourRate >= 35 ? "text-green-600" : tourRate < 20 ? "text-red-500" : "text-gray-700")}>
                      {tourRate}%
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-700">{src.apps}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={cn("font-semibold", src.move_ins > 0 ? "text-gray-900" : "text-gray-400")}>
                        {src.move_ins}
                      </span>
                    </td>
                    <td className={cn("px-5 py-3.5 text-right font-semibold", convRate >= 8 ? "text-green-600" : convRate === 0 ? "text-red-500" : "text-gray-700")}>
                      {convRate}%
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-500">
                      {src.cost_per_lead === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        `$${src.cost_per_lead}`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* ── Leasing Performance ─────────────────────────────────────────── */}
      <div>
        <SectionLabel>Leasing Performance</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PERF.map((m) => (
            <MetricCell key={m.label} label={m.label} value={m.value} good={m.good} benchmark={m.benchmark} />
          ))}
        </div>
      </div>

      {/* ── Issues & Opportunities ──────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <SectionLabel>Issues & Opportunities</SectionLabel>
          <span className="text-xs text-gray-400">{criticalCount} critical · {ISSUES.filter(i => i.type === "warning").length} warnings · {ISSUES.filter(i => i.type === "opportunity").length} opportunities</span>
        </div>
        <div className="space-y-3">
          {ISSUES.map((issue, i) => {
            const s = ISSUE_STYLES[issue.type];
            return (
              <div key={i} className="relative flex gap-4 overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                <div className={cn("absolute bottom-0 left-0 top-0 w-1", s.bar)} />
                <div className="ml-3 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", s.badge)}>
                          {s.icon} {s.badgeText}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold text-gray-900">{issue.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">{issue.body}</p>
                    </div>
                  </div>
                  {issue.action && issue.href && (
                    <Link href={issue.href} className="mt-3 inline-block text-xs font-medium text-[#C8102E] hover:underline">
                      {issue.action} →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Rent Roll & Occupancy ───────────────────────────────────────── */}
      <RentRollSection propertyId={propertyId} />

      {/* ── AI Configuration ────────────────────────────────────────────── */}
      <AIConfigSection />

      {/* ── Recent Lead Activity ────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <SectionLabel>Recent Lead Activity</SectionLabel>
          <Link
            href={`/leads?property=${PROPERTY.id}`}
            className="text-xs font-medium text-[#C8102E] hover:underline"
          >
            View all leads →
          </Link>
        </div>
        <Card padding="none">
          <div className="divide-y divide-gray-50">
            {ACTIVITY.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                  {item.lead.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{item.lead}</span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", ACTOR_STYLES[item.actor])}>
                      {item.actor}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{item.event}</p>
                </div>

                {/* Time */}
                <span className="shrink-0 text-[11px] text-gray-400">{item.time}</span>

                {/* Link */}
                <Link
                  href={`/leads?lead=${item.id}`}
                  className="shrink-0 text-[11px] font-medium text-gray-400 transition-colors hover:text-[#C8102E]"
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}
