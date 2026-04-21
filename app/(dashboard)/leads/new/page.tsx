"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOperatorEmail } from "@/lib/demo-auth";

interface Property { id: string; name: string; }

export default function NewLeadPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", propertyId: "",
    source: "manual", preferredContact: "sms",
    moveInDate: "", bedrooms: "", budgetMin: "", budgetMax: "", notes: "",
  });

  useEffect(() => {
    getOperatorEmail().then(async (email) => {
      if (!email) { router.push("/setup"); return; }
      const res = await fetch(`/api/properties?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      const props: Property[] = json.properties ?? [];
      setProperties(props);
      if (props.length) setForm(f => ({ ...f, propertyId: props[0].id }));
    });
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent, sendOutreach: boolean) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.propertyId) {
      setError("Name, phone, and property are required.");
      return;
    }
    setLoading(true);
    setError(null);

    const nameParts = form.name.trim().split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName  = nameParts.slice(1).join(" ") || "";
    const unitTypeMap: Record<string, string> = { "0": "studio", "1": "1br", "2": "2br", "3": "3br" };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId:             form.propertyId,
          firstName,
          lastName,
          phone:                  form.phone,
          email:                  form.email || undefined,
          preferredContactMethod: form.preferredContact,
          source:                 form.source,
          desiredMoveDate:        form.moveInDate || undefined,
          unitType:               form.bedrooms !== "" ? unitTypeMap[form.bedrooms] : undefined,
          budget: (form.budgetMin || form.budgetMax) ? {
            min: form.budgetMin ? Number(form.budgetMin) : undefined,
            max: form.budgetMax ? Number(form.budgetMax) : undefined,
          } : undefined,
          skipSms: !sendOutreach,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create lead"); return; }
      router.push("/leads");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161F] px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#C8102E] focus:outline-none dark:focus:border-[#C8102E]";

  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/leads" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Leads</Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Lead</h1>
            <p className="text-sm text-gray-500">Manually create a lead and trigger an AI outreach</p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>

          {/* Contact Info */}
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Contact Info</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Jordan Ellis" className={inputCls} />
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone <span className="text-red-500">*</span></label>
                  <input value={form.phone} onChange={e => set("phone", e.target.value)} type="tel" placeholder="+17025550101" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input value={form.email} onChange={e => set("email", e.target.value)} type="email" placeholder="jordan@email.com" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Contact</label>
                <select value={form.preferredContact} onChange={e => set("preferredContact", e.target.value)} className={inputCls}>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                </select>
              </div>
            </div>
          </div>

          {/* Property & Source */}
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Property & Source</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Property <span className="text-red-500">*</span></label>
                <select value={form.propertyId} onChange={e => set("propertyId", e.target.value)} className={inputCls}>
                  <option value="">Select property…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {properties.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-500">No properties found. <Link href="/properties/new" className="underline">Add one first.</Link></p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Lead Source</label>
                <select value={form.source} onChange={e => set("source", e.target.value)} className={inputCls}>
                  <option value="manual">Manual Entry</option>
                  <option value="zillow">Zillow</option>
                  <option value="apartments.com">Apartments.com</option>
                  <option value="website">Website</option>
                  <option value="facebook">Facebook</option>
                  <option value="referral">Referral</option>
                </select>
              </div>
            </div>
          </div>

          {/* Qualification */}
          <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Qualification (optional)</h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Move-in Date</label>
                  <input type="date" value={form.moveInDate} onChange={e => set("moveInDate", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Bedrooms</label>
                  <select value={form.bedrooms} onChange={e => set("bedrooms", e.target.value)} className={inputCls}>
                    <option value="">Any</option>
                    <option value="0">Studio</option>
                    <option value="1">1 Bedroom</option>
                    <option value="2">2 Bedrooms</option>
                    <option value="3">3 Bedrooms</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Budget Min ($)</label>
                  <input type="number" value={form.budgetMin} onChange={e => set("budgetMin", e.target.value)} placeholder="1500" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Budget Max ($)</label>
                  <input type="number" value={form.budgetMax} onChange={e => set("budgetMax", e.target.value)} placeholder="2200" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional context about this lead…" className={`${inputCls} resize-none`} />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/leads" className="rounded-xl border border-gray-200 dark:border-white/10 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-center sm:text-left">
              Cancel
            </Link>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={e => handleSubmit(e as unknown as React.FormEvent, false)}
                disabled={loading}
                className="rounded-xl border border-gray-200 dark:border-white/10 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
              >
                Save Only
              </button>
              <button
                type="button"
                onClick={e => handleSubmit(e as unknown as React.FormEvent, true)}
                disabled={loading}
                className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
              >
                {loading ? "Saving…" : "Save & Send AI Outreach"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
