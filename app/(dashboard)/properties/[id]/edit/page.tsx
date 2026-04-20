"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  const [form, setForm] = useState({
    name: "", address: "", city: "", state: "", zip: "",
    neighborhood: "", phone_number: "", active_special: "",
    website_url: "", total_units: "", tour_booking_url: "",
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
            name:            p.name ?? "",
            address:         p.address ?? "",
            city:            p.city ?? "",
            state:           p.state ?? "",
            zip:             p.zip ?? "",
            neighborhood:    p.neighborhood ?? "",
            phone_number:    p.phone_number ?? "",
            active_special:  p.active_special ?? "",
            website_url:     p.website_url ?? "",
            total_units:     p.total_units != null ? String(p.total_units) : "",
            tour_booking_url: p.tour_booking_url ?? "",
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
              <div className="grid gap-3 grid-cols-3">
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
              <div className="grid gap-3 grid-cols-2">
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
            </div>
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
            <button type="submit" disabled={saving}
              className="rounded-xl bg-[#C8102E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
              {saved ? "Saved ✓" : saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
