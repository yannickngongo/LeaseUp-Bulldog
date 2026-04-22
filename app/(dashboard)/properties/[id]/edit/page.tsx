"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Unit {
  unit_name: string;
  unit_type: string | null;
  bedrooms: number | null;
  sq_ft: number | null;
  status: string;
  current_resident: string;
  lease_end: string;
  monthly_rent: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  occupied:    "bg-green-100 text-green-700",
  vacant:      "bg-gray-100 text-gray-600",
  notice:      "bg-amber-100 text-amber-700",
  unavailable: "bg-red-100 text-red-600",
};

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Rent Roll Upload ─────────────────────────────────────────────────────────

function RentRollSection({ propertyId }: { propertyId: string }) {
  const [units, setUnits]         = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [parsing, setParsing]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState<Unit[]>([]);
  const [uploadMsg, setUploadMsg] = useState("");

  const loadUnits = useCallback(async () => {
    setLoadingUnits(true);
    const res = await fetch(`/api/properties/${propertyId}/units`);
    if (res.ok) {
      const json = await res.json();
      setUnits(json.units ?? []);
    }
    setLoadingUnits(false);
  }, [propertyId]);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) { setUploadMsg("Only PDF files are supported."); return; }

    setParsing(true);
    setUploadMsg("");
    setPreview([]);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/properties/${propertyId}/parse-rent-roll`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && Array.isArray(data.units)) {
        setPreview(data.units);
        setUploadMsg(`AI extracted ${data.units.length} units. Review and save below.`);
      } else {
        setUploadMsg(data.error ?? "Failed to read file. Try again.");
      }
    } catch {
      setUploadMsg("Network error. Try again.");
    } finally {
      setParsing(false);
    }
  }

  async function saveUnits() {
    if (preview.length === 0) return;
    setUploading(true);
    setUploadMsg("");
    const res = await fetch(`/api/properties/${propertyId}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ units: preview }),
    });
    if (res.ok) {
      setUploadMsg(`✓ ${preview.length} units saved. Occupancy updated.`);
      setPreview([]);
      await loadUnits();
    } else {
      const j = await res.json();
      setUploadMsg(j.error ?? "Upload failed");
    }
    setUploading(false);
  }

  const occupied = units.filter(u => u.status === "occupied").length;
  const vacant   = units.filter(u => u.status === "vacant").length;
  const notice   = units.filter(u => u.status === "notice").length;

  return (
    <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Rent Roll & Occupancy</h2>
      <p className="mb-5 text-xs text-gray-400">Upload your rent roll PDF — AI extracts all units, bed/bath, status, rent, and residents automatically.</p>

      {/* Current stats */}
      {units.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Units", value: units.length, color: "text-gray-900 dark:text-white" },
            { label: "Occupied",    value: occupied,     color: "text-green-600" },
            { label: "Vacant",      value: vacant,       color: "text-amber-600" },
            { label: "Notice",      value: notice,       color: "text-red-500" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-3 text-center">
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <label className={cn(
        "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
        parsing ? "border-[#C8102E]/40 bg-[#C8102E]/5" : "border-gray-200 hover:border-[#C8102E]/40 dark:border-white/10"
      )}>
        <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={parsing} />
        {parsing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#C8102E]/30 border-t-[#C8102E]" />
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
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Click to upload Rent Roll PDF</p>
              <p className="text-xs text-gray-400 mt-0.5">Works with Yardi, AppFolio, RealPage, Entrata, MRI exports</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-[#C8102E]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#C8102E]">PDF — AI reads it</span>
            </div>
          </>
        )}
      </label>

      {/* Preview after parse */}
      {preview.length > 0 && (() => {
        const occ = preview.filter(u => u.status === "occupied").length;
        const vac = preview.filter(u => u.status === "vacant").length;
        const ntv = preview.filter(u => u.status === "notice" || u.status === "unavailable").length;
        return (
          <div className="mt-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-4">
            <p className="mb-3 text-xs font-semibold text-gray-700 dark:text-gray-200">AI found {preview.length} units — review before saving</p>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Total",    value: preview.length, color: "text-gray-900 dark:text-white" },
                { label: "Occupied", value: occ,            color: "text-green-600" },
                { label: "Vacant",   value: vac,            color: "text-amber-600" },
                { label: "Notice",   value: ntv,            color: "text-red-500" },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1F2E] p-2 text-center">
                  <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-[10px] text-gray-400">
                <span>Occupancy rate</span>
                <span className="font-semibold">{Math.round((occ / preview.length) * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.round((occ / preview.length) * 100)}%` }} />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto overflow-x-auto">
              <table className="min-w-[520px] w-full text-xs">
                <thead><tr className="sticky top-0 bg-gray-50 dark:bg-[#1C1F2E] text-left text-gray-400">
                  <th className="pb-1.5 pr-3">Unit</th>
                  <th className="pb-1.5 pr-3">Status</th>
                  <th className="pb-1.5 pr-3">Type</th>
                  <th className="pb-1.5 pr-3">Beds</th>
                  <th className="pb-1.5 pr-3">Sq Ft</th>
                  <th className="pb-1.5 pr-3">Resident</th>
                  <th className="pb-1.5">Rent</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {preview.map((u, i) => (
                    <tr key={i}>
                      <td className="py-1 pr-3 font-medium text-gray-900 dark:text-gray-100">{u.unit_name}</td>
                      <td className="py-1 pr-3"><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize", STATUS_COLORS[u.status] ?? "bg-gray-100 text-gray-600")}>{u.status}</span></td>
                      <td className="py-1 pr-3 text-gray-500">{u.unit_type || "—"}</td>
                      <td className="py-1 pr-3 text-gray-500">{u.bedrooms ?? "—"}</td>
                      <td className="py-1 pr-3 text-gray-500">{u.sq_ft ?? "—"}</td>
                      <td className="py-1 pr-3 text-gray-500">{u.current_resident || "—"}</td>
                      <td className="py-1 text-gray-500">{u.monthly_rent ? `$${u.monthly_rent.toLocaleString()}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={saveUnits} disabled={uploading}
              className="mt-4 w-full rounded-xl bg-[#C8102E] py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-50 transition-colors">
              {uploading ? "Saving…" : `Save ${preview.length} Units to Property`}
            </button>
          </div>
        );
      })()}

      {uploadMsg && (
        <p className={cn("mt-3 text-xs font-medium", uploadMsg.startsWith("✓") ? "text-green-600" : uploadMsg.includes("AI extracted") ? "text-[#C8102E]" : "text-red-600")}>
          {uploadMsg}
        </p>
      )}

      {/* Existing units table */}
      {!loadingUnits && units.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold text-gray-500">Current Units on File</p>
          <div className="max-h-64 overflow-y-auto overflow-x-auto rounded-xl border border-gray-100 dark:border-white/5">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-100 dark:border-white/5 text-left text-gray-400">
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Beds</th>
                <th className="px-3 py-2">Sq Ft</th>
                <th className="px-3 py-2">Rent</th>
                <th className="px-3 py-2">Lease End</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {units.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{u.unit_name}</td>
                    <td className="px-3 py-2"><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize", STATUS_COLORS[u.status] ?? "bg-gray-100 text-gray-600")}>{u.status}</span></td>
                    <td className="px-3 py-2 text-gray-500">{u.unit_type || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{u.bedrooms ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{u.sq_ft ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{u.monthly_rent ? `$${u.monthly_rent.toLocaleString()}` : "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{u.lease_end || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "", address: "", city: "", state: "", zip: "",
    neighborhood: "", phone_number: "", active_special: "",
    website_url: "", total_units: "", tour_booking_url: "", notify_email: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = "w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161F] px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#C8102E] focus:outline-none";

  useEffect(() => {
    fetch(`/api/properties/${id}/details`)
      .then(r => r.json())
      .then(d => {
        if (d.property) {
          const p = d.property;
          setForm({
            name:             p.name ?? "",
            address:          p.address ?? "",
            city:             p.city ?? "",
            state:            p.state ?? "",
            zip:              p.zip ?? "",
            neighborhood:     p.neighborhood ?? "",
            phone_number:     p.phone_number ?? "",
            active_special:   p.active_special ?? "",
            website_url:      p.website_url ?? "",
            total_units:      p.total_units != null ? String(p.total_units) : "",
            tour_booking_url: p.tour_booking_url ?? "",
            notify_email:     p.notify_email ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.address || !form.city || !form.state || !form.zip || !form.phone_number) {
      setError("Name, address, city, state, ZIP, and phone are required."); return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/properties/${id}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:             form.name,
          address:          form.address,
          city:             form.city,
          state:            form.state,
          zip:              form.zip,
          neighborhood:     form.neighborhood || null,
          phone_number:     form.phone_number,
          active_special:   form.active_special || null,
          website_url:      form.website_url || null,
          total_units:      form.total_units ? parseInt(form.total_units) : null,
          tour_booking_url: form.tour_booking_url || null,
          notify_email:     form.notify_email || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save"); return; }
      setSaved(true);
      setTimeout(() => router.push("/properties"), 1200);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C8102E]" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/properties" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Properties</Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Property</h1>
            <p className="text-sm text-gray-500">{form.name}</p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>

          {/* Property Info */}
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Property Info</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Property Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => set("name", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Street Address <span className="text-red-500">*</span></label>
                <input value={form.address} onChange={e => set("address", e.target.value)} className={inputCls} />
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">City <span className="text-red-500">*</span></label>
                  <input value={form.city} onChange={e => set("city", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">State <span className="text-red-500">*</span></label>
                  <input value={form.state} onChange={e => set("state", e.target.value)} maxLength={2} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">ZIP <span className="text-red-500">*</span></label>
                  <input value={form.zip} onChange={e => set("zip", e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Neighborhood</label>
                <input value={form.neighborhood} onChange={e => set("neighborhood", e.target.value)} placeholder="e.g. Downtown, Midtown" className={inputCls} />
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Total Units</label>
                  <input type="number" value={form.total_units} onChange={e => set("total_units", e.target.value)} placeholder="120" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Website URL</label>
                  <input type="url" value={form.website_url} onChange={e => set("website_url", e.target.value)} placeholder="https://..." className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          {/* AI & Twilio */}
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-gray-500">AI & Twilio</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">AI Phone Number (Twilio) <span className="text-red-500">*</span></label>
                <input value={form.phone_number} onChange={e => set("phone_number", e.target.value)} placeholder="+17025551234" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Current Special / Promotion</label>
                <input value={form.active_special} onChange={e => set("active_special", e.target.value)} placeholder="1 month free on 12-month leases" className={inputCls} />
                <p className="mt-1 text-xs text-gray-400">AI mentions this in every conversation.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Tour Booking URL</label>
                <input value={form.tour_booking_url} onChange={e => set("tour_booking_url", e.target.value)} placeholder="https://calendly.com/..." className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Operator Notification Email</label>
                <input type="email" value={form.notify_email} onChange={e => set("notify_email", e.target.value)} placeholder="you@company.com" className={inputCls} />
                <p className="mt-1 text-xs text-gray-400">Alerts for hot leads, tour requests, and AI escalations sent here.</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <Link href="/properties" className="rounded-xl border border-gray-200 dark:border-white/10 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-center">
                Cancel
              </Link>
              <button type="button" disabled={deleting}
                onClick={async () => {
                  if (!confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
                  setDeleting(true);
                  const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
                  if (res.ok) { router.push("/properties"); }
                  else { setError("Failed to delete property"); setDeleting(false); }
                }}
                className="rounded-xl border border-red-200 dark:border-red-900/50 px-5 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 transition-colors">
                {deleting ? "Deleting…" : "Delete Property"}
              </button>
            </div>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-[#C8102E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
              {saved ? "Saved ✓" : saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Rent Roll — outside the form so it doesn't interfere with submit */}
        <div className="mt-6">
          <RentRollSection propertyId={id} />
        </div>

      </div>
    </div>
  );
}
