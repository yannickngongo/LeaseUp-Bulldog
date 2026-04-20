"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOperatorEmail } from "@/lib/demo-auth";

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", address: "", city: "", state: "", zip: "",
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
          phoneNumber:    form.phoneNumber,
          activeSpecial:  form.activeSpecial,
          websiteUrl:     form.websiteUrl,
          totalUnits:     form.totalUnits,
          tourBookingUrl: form.tourBookingUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create property"); return; }
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
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Total Units</label>
                  <input type="number" value={form.totalUnits} onChange={e => set("totalUnits", e.target.value)} placeholder="120" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Website URL</label>
                  <input type="url" value={form.websiteUrl} onChange={e => set("websiteUrl", e.target.value)} placeholder="https://sunriseapts.com" className={inputCls} />
                </div>
              </div>
            </div>
          </div>

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
