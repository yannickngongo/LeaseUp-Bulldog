"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOperatorEmail } from "@/lib/demo-auth";

// ─── CSV parser ───────────────────────────────────────────────────────────────

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
      typeRaw.includes("1") ? "1br" : typeRaw || null;

    const bedsRaw = col(row, "bed");
    const bedrooms = bedsRaw ? parseInt(bedsRaw, 10) || null : null;

    const sqftRaw = col(row, "sq") || col(row, "sqft") || col(row, "size");
    const sq_ft = sqftRaw ? parseInt(sqftRaw.replace(/\D/g, ""), 10) || null : null;

    const rentRaw = col(row, "rent") || col(row, "price") || col(row, "amount");
    const monthly_rent = rentRaw ? parseInt(rentRaw.replace(/[^0-9]/g, ""), 10) || null : null;

    return {
      unit_name:        unitName,
      unit_type:        unit_type ?? "",
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

function RentRollUpload({
  onChange,
}: {
  value: string;
  onChange: (units: ParsedUnit[]) => void;
}) {
  const [preview, setPreview]   = useState<ParsedUnit[]>([]);
  const [parsing, setParsing]   = useState(false);
  const [msg, setMsg]           = useState("");

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".txt");

    if (!isPdf && !isCsv) { setMsg("Only PDF or CSV files are supported."); return; }

    setParsing(true);
    setMsg("");
    setPreview([]);
    onChange([]);

    if (isPdf) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        // Use "new" as placeholder — parse-rent-roll doesn't need a real property ID
        const res = await fetch("/api/properties/new/parse-rent-roll", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok && Array.isArray(data.units)) {
          setPreview(data.units);
          onChange(data.units);
          setMsg(`AI extracted ${data.units.length} units from PDF.`);
        } else {
          setMsg(data.error ?? "Failed to read PDF.");
        }
      } catch {
        setMsg("Network error reading PDF. Try again.");
      } finally {
        setParsing(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        const parsed = parseRentRollCsv(text);
        setPreview(parsed);
        onChange(parsed);
        setMsg(`Parsed ${parsed.length} units from CSV.`);
        setParsing(false);
      };
      reader.readAsText(file);
    }
  }, [onChange]);

  const occupied = preview.filter(u => u.status === "occupied" || u.status === "notice").length;

      {showPreview && preview.length > 0 && (
        <div className="rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 px-4 py-2.5">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {preview.length} units parsed · {occupied} occupied · {preview.length - occupied} vacant
            </p>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
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
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [rentRollCsv, setRentRollCsv] = useState("");

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

      // Upload rent roll if provided
      if (rentRollCsv.trim() && json.property?.id) {
        const units = parseRentRollCsv(rentRollCsv);
        if (units.length > 0) {
          await fetch(`/api/properties/${json.property.id}/units`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ units }),
          });
        }
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
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rent Roll</h2>
              <p className="mt-1 text-xs text-gray-400">
                Upload or paste your current rent roll CSV to automatically populate units, occupancy, and unit names.
                Required columns: <span className="font-mono">Unit Number, Status</span>. Optional: Unit Type, Current Resident, Lease End Date, Monthly Rent.
              </p>
            </div>
            <RentRollUpload value={rentRollCsv} onChange={setRentRollCsv} />
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
