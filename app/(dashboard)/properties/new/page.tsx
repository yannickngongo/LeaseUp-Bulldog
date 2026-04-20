"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOperatorEmail } from "@/lib/demo-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedUnit {
  unit_name:        string;
  unit_type:        string;
  bedrooms:         number | null;
  sq_ft:            number | null;
  status:           string;
  current_resident: string;
  lease_end:        string;
  monthly_rent:     number | null;
}

// ─── CSV parser (fallback for CSV uploads) ────────────────────────────────────

function parseRentRollCsv(raw: string): ParsedUnit[] {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  const col = (row: string[], name: string) => {
    const idx = headers.findIndex(h => h.includes(name));
    return idx >= 0 ? (row[idx] ?? "").trim().replace(/"/g, "") : "";
  };

  return lines.slice(1).map(line => {
    const row = line.split(",");
    const unitName = col(row, "unit");
    if (!unitName) return null;

    const statusRaw = col(row, "status").toLowerCase();
    const status =
      statusRaw.includes("occup") ? "occupied" :
      statusRaw.includes("notice") ? "notice" :
      statusRaw.includes("unavail") ? "unavailable" : "vacant";

    const typeRaw = col(row, "type").toLowerCase();
    const unit_type =
      typeRaw.includes("studio") ? "studio" :
      typeRaw.includes("4") ? "4br" :
      typeRaw.includes("3") ? "3br" :
      typeRaw.includes("2") ? "2br" :
      typeRaw.includes("1") ? "1br" : typeRaw || "";

    const bedsRaw = col(row, "bed");
    const bedrooms = bedsRaw ? parseInt(bedsRaw, 10) || null : null;

    const sqftRaw = col(row, "sq") || col(row, "sqft") || col(row, "size");
    const sq_ft = sqftRaw ? parseInt(sqftRaw.replace(/\D/g, ""), 10) || null : null;

    const rentRaw = col(row, "rent") || col(row, "price") || col(row, "amount");
    const monthly_rent = rentRaw ? parseInt(rentRaw.replace(/[^0-9]/g, ""), 10) || null : null;

    return {
      unit_name:        unitName,
      unit_type,
      bedrooms,
      sq_ft,
      status,
      current_resident: col(row, "resident") || col(row, "tenant") || col(row, "name"),
      lease_end:        col(row, "lease end") || col(row, "end date") || col(row, "move out"),
      monthly_rent,
    } as ParsedUnit;
  }).filter(Boolean) as ParsedUnit[];
}

// ─── Rent Roll Upload Component ───────────────────────────────────────────────

function RentRollUpload({ onChange }: { onChange: (units: ParsedUnit[]) => void }) {
  const [preview, setPreview]     = useState<ParsedUnit[]>([]);
  const [parsing, setParsing]     = useState(false);
  const [showTable, setShowTable] = useState(true);
  const [msg, setMsg]             = useState("");

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setMsg("Only PDF files are supported.");
      return;
    }

    setParsing(true);
    setMsg("");
    setPreview([]);
    onChange([]);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/properties/new/parse-rent-roll", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && Array.isArray(data.units)) {
        setPreview(data.units);
        onChange(data.units);
        setShowTable(true);
        setMsg(`AI extracted ${data.units.length} units from PDF.`);
      } else {
        setMsg(data.error ?? "Failed to read PDF.");
      }
    } catch {
      setMsg("Network error reading PDF. Try again.");
    } finally {
      setParsing(false);
    }
  }, [onChange]);

  const occupied = preview.filter(u => u.status === "occupied" || u.status === "notice").length;
  const vacant   = preview.filter(u => u.status === "vacant").length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-6 py-8 cursor-pointer hover:border-[#C8102E]/50 transition-colors">
        <input type="file" accept=".pdf" className="sr-only" onChange={handleFile} disabled={parsing} />
        {parsing ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Reading file with AI…</p>
          </>
        ) : (
          <>
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Rent Roll</p>
              <p className="text-xs text-gray-400 mt-0.5">PDF — AI will extract all units automatically</p>
            </div>
          </>
        )}
      </label>

      {/* Status message */}
      {msg && (
        <p className={`text-xs ${msg.includes("error") || msg.includes("Failed") ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
          {msg}
        </p>
      )}

      {/* Summary stats */}
      {preview.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Units", value: preview.length, color: "text-gray-900 dark:text-white" },
            { label: "Occupied",    value: occupied,        color: "text-green-600 dark:text-green-400" },
            { label: "Vacant",      value: vacant,          color: "text-amber-600 dark:text-amber-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] px-4 py-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Unit table preview */}
      {preview.length > 0 && showTable && (
        <div className="rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 px-4 py-2.5">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Unit Preview</p>
            <button type="button" onClick={() => setShowTable(false)} className="text-xs text-gray-400 hover:text-gray-600">
              hide
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  {["Unit", "Type", "Status", "Resident", "Lease End", "Rent"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((u, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-white/5 last:border-0">
                    <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-gray-100">{u.unit_name}</td>
                    <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{u.unit_type || "—"}</td>
                    <td className="px-3 py-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        u.status === "occupied" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        u.status === "notice"   ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{u.current_resident || "—"}</td>
                    <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{u.lease_end || "—"}</td>
                    <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{u.monthly_rent ? `$${u.monthly_rent}` : "—"}</td>
                  </tr>
                ))}
                {preview.length > 20 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-center text-xs text-gray-400">
                      +{preview.length - 20} more units
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [rentRollUnits, setRentRollUnits] = useState<ParsedUnit[]>([]);

  const [form, setForm] = useState({
    name: "", address: "", city: "", state: "", zip: "",
    neighborhood: "",
    phoneNumber: "", activeSpecial: "", websiteUrl: "",
    totalUnits: "", tourBookingUrl: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = "w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161F] px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#C8102E] focus:outline-none";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = await getOperatorEmail();
    if (!email) { setError("No account found — please complete setup first."); return; }
    if (!form.name || !form.address || !form.city || !form.state || !form.zip || !form.phoneNumber) {
      setError("All required fields must be filled in."); return;
    }
    setLoading(true);
    setError(null);
    try {
      const setupRes = await fetch(`/api/setup?email=${encodeURIComponent(email)}`);
      const setupJson = await setupRes.json();
      const operatorName = setupJson.operator?.name ?? email.split("@")[0];

      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorName,
          email,
          propertyName:   form.name,
          address:        form.address,
          city:           form.city,
          state:          form.state,
          zip:            form.zip,
          neighborhood:   form.neighborhood || null,
          phoneNumber:    form.phoneNumber,
          activeSpecial:  form.activeSpecial,
          websiteUrl:     form.websiteUrl,
          totalUnits:     form.totalUnits,
          tourBookingUrl: form.tourBookingUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create property"); return; }

      // Upload rent roll units if we have any
      if (rentRollUnits.length > 0 && json.property?.id) {
        await fetch(`/api/properties/${json.property.id}/units`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ units: rentRollUnits }),
        });
      }

      router.push("/properties");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/properties" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Properties</Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Property</h1>
            <p className="text-sm text-gray-500">Connect a Twilio number to start receiving and sending SMS</p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>

          {/* Property Info */}
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Property Info</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Property Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Sunrise Apartments" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Street Address <span className="text-red-500">*</span></label>
                <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="1234 Desert Rose Blvd" className={inputCls} />
              </div>
              <div className="grid gap-3 grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">City <span className="text-red-500">*</span></label>
                  <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Las Vegas" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">State <span className="text-red-500">*</span></label>
                  <input value={form.state} onChange={e => set("state", e.target.value)} placeholder="NV" maxLength={2} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">ZIP <span className="text-red-500">*</span></label>
                  <input value={form.zip} onChange={e => set("zip", e.target.value)} placeholder="89101" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Neighborhood</label>
                <input value={form.neighborhood} onChange={e => set("neighborhood", e.target.value)} placeholder="e.g. Summerlin, Henderson, Downtown Las Vegas" className={inputCls} />
                <p className="mt-1 text-xs text-gray-400">Used for neighborhood-level market analysis (more precise than ZIP code).</p>
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Total Units</label>
                  <input type="number" value={form.totalUnits} onChange={e => set("totalUnits", e.target.value)} placeholder="120" className={inputCls} />
                  <p className="mt-1 text-xs text-gray-400">Auto-updated from rent roll if uploaded.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Website URL</label>
                  <input type="url" value={form.websiteUrl} onChange={e => set("websiteUrl", e.target.value)} placeholder="https://sunriseapts.com" className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          {/* Twilio & AI Setup */}
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Twilio & AI Setup</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Twilio Phone Number <span className="text-red-500">*</span></label>
                <input value={form.phoneNumber} onChange={e => set("phoneNumber", e.target.value)} placeholder="+17025551234" className={inputCls} />
                <p className="mt-1 text-xs text-gray-400">Format: +1XXXXXXXXXX — purchase this number in your Twilio console first.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Current Special / Promotion</label>
                <input value={form.activeSpecial} onChange={e => set("activeSpecial", e.target.value)} placeholder="1 month free on 12-month leases" className={inputCls} />
                <p className="mt-1 text-xs text-gray-400">AI will mention this automatically in every conversation.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Tour Booking URL</label>
                <input value={form.tourBookingUrl} onChange={e => set("tourBookingUrl", e.target.value)} placeholder="https://calendly.com/yourproperty" className={inputCls} />
                <p className="mt-1 text-xs text-gray-400">AI will share this link when prospects ask about tours.</p>
              </div>
            </div>
          </div>

          {/* Rent Roll Upload */}
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
            <div className="mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rent Roll (Optional)</h2>
              <p className="mt-1 text-xs text-gray-400">
                Upload your rent roll PDF — AI will extract all unit info automatically.
              </p>
            </div>
            <RentRollUpload onChange={setRentRollUnits} />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Link href="/properties" className="rounded-xl border border-gray-200 dark:border-white/10 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#C8102E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
            >
              {loading ? "Creating…" : "Add Property →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
