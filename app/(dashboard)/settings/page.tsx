"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

interface Operator {
  id: string;
  name: string;
  plan: string;
}

interface Property {
  id: string;
  name: string;
  phone_number: string;
  address: string;
  city: string;
  state: string;
}

interface Lead {
  id: string;
  status: string;
  created_at: string;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 dark:bg-white/5 ${className ?? ""}`} />;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M3 8l3.5 3.5L13 4" />
    </svg>
  );
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter:  { label: "Starter",  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  growth:   { label: "Growth",   color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  pro:      { label: "Pro",      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  enterprise: { label: "Enterprise", color: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300" },
};

export default function SettingsPage() {
  const [operator, setOperator]     = useState<Operator | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [email, setEmail]           = useState("");
  const [loading, setLoading]       = useState(true);
  const [name, setName]             = useState("");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { user } } = await getSupabase().auth.getUser();
        if (!user?.email) return;
        setEmail(user.email);

        const res = await fetch(`/api/setup?email=${encodeURIComponent(user.email)}`);
        const json = await res.json();

        if (json.operator) {
          setOperator(json.operator);
          setName(json.operator.name ?? "");
        }

        const props: Property[] = json.properties ?? [];
        setProperties(props);

        // Load leads for all properties
        const allLeads: Lead[] = [];
        await Promise.all(props.map(async (p) => {
          const r = await fetch(`/api/leads?propertyId=${p.id}`);
          const j = await r.json();
          allLeads.push(...(j.leads ?? []));
        }));
        setLeads(allLeads);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    if (!email || !name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name.trim() }),
      });
      setOperator(prev => prev ? { ...prev, name: name.trim() } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  // Billing stats — real data
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const wonThisMonth = leads.filter(l =>
    l.status === "won" && new Date(l.created_at) >= startOfMonth
  ).length;
  const performanceFee = wonThisMonth * 200;
  const platformFee = 1000;
  const totalDue = platformFee + performanceFee;

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextBillingDate = nextMonth.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const planInfo = PLAN_LABELS[operator?.plan ?? "starter"] ?? PLAN_LABELS.starter;

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account, properties, and billing</p>
        </div>

        {/* ── Profile ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Profile</h2>
          {loading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-10" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name or company"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="mt-1 text-[11px] text-gray-400">Email is managed by your login provider.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Plan</label>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${planInfo.color}`}>
                    {planInfo.label}
                  </span>
                  <span className="text-xs text-gray-400">Operator ID: <span className="font-mono">{operator?.id?.slice(0, 8)}…</span></span>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving || name.trim() === operator?.name}
                  className="rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#A50D25] disabled:opacity-50"
                >
                  {saved ? "✓ Saved" : saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Properties ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Properties</h2>
            <a href="/setup" className="text-xs font-semibold text-[#C8102E] hover:underline">+ Add Property</a>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-white/10 py-8 text-center">
              <p className="text-sm text-gray-400">No properties yet.</p>
              <a href="/setup" className="mt-2 inline-block text-xs font-semibold text-[#C8102E] hover:underline">Set up your first property →</a>
            </div>
          ) : (
            <div className="space-y-3">
              {properties.map(p => (
                <div key={p.id} className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/5 dark:bg-white/5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.address}, {p.city}, {p.state}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-gray-400">
                        <path d="M2 2a1 1 0 011-1h2a1 1 0 01.95.684l.74 2.22a1 1 0 01-.233 1.022L5.2 6.16a9.7 9.7 0 004.64 4.64l1.234-1.257a1 1 0 011.022-.233l2.22.74A1 1 0 0115 11v2a1 1 0 01-1 1h-1C6.82 14 2 9.18 2 3V2z" />
                      </svg>
                      <span className="font-mono text-[11px] text-gray-600 dark:text-gray-300">{p.phone_number}</span>
                      <span className="text-[10px] font-semibold text-gray-400">AI line</span>
                    </div>
                  </div>
                  <a href="/setup" className="ml-4 shrink-0 text-xs font-medium text-[#C8102E] hover:underline">Edit</a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Usage & Billing ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Usage & Billing</h2>

          <div className="space-y-3">
            {/* Platform fee */}
            <div className="flex items-center justify-between rounded-xl border border-[#C8102E]/20 bg-[#C8102E]/5 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Platform Fee</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Full AI leasing suite · unlimited leads · 24/7 SMS</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">$1,000<span className="text-xs font-normal text-gray-400">/mo</span></p>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckIcon /> Active
                </span>
              </div>
            </div>

            {/* Performance fee */}
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/20 dark:bg-amber-900/10">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Performance Fee</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Per lease signed through LeaseUp Bulldog · 30-day attribution</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">$200<span className="text-xs font-normal text-gray-400">/lease</span></p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">Pay for results</p>
              </div>
            </div>
          </div>

          {/* This month — real data */}
          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-white/5 dark:bg-white/5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {now.toLocaleString("default", { month: "long", year: "numeric" })}
            </p>
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{wonThisMonth}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Leases signed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#C8102E]">${performanceFee.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Performance fees</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalDue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Est. total due</p>
                </div>
              </div>
            )}
            <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
              Next billing date: {nextBillingDate} · $1,000 platform{performanceFee > 0 ? ` + $${performanceFee.toLocaleString()} performance` : ""}
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-gray-100 px-4 py-3 dark:border-white/5">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Billing managed by LeaseUp Bulldog team</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Contact your account manager for invoices, receipts, or billing changes.</p>
          </div>
        </div>

        {/* ── Integrations ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Integrations</h2>
          <div className="space-y-3">
            {[
              { name: "Twilio",             desc: "SMS delivery · inbound & outbound AI responses",  status: "connected" },
              { name: "Anthropic Claude",   desc: "AI engine powering lead replies & intelligence",   status: "connected" },
              { name: "Supabase",           desc: "Database, auth, and real-time data",              status: "connected" },
              { name: "Zapier",             desc: "Connect to 5,000+ apps",                          status: "coming_soon" },
              { name: "Facebook Ads",       desc: "AI-generated ad campaigns",                        status: "coming_soon" },
            ].map(int => (
              <div key={int.name} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-white/5">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{int.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{int.desc}</p>
                </div>
                {int.status === "connected" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckIcon /> Connected
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-white/5 dark:text-gray-400">Coming soon</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Danger Zone ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm dark:border-red-900/30 dark:bg-[#1C1F2E]">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-red-400">Danger Zone</h2>
          <div className="flex items-center justify-between rounded-lg border border-red-100 px-4 py-3 dark:border-red-900/30">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete Account</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Permanently removes your account, properties, and all lead data. Cannot be undone.</p>
            </div>
            <button className="ml-4 shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}
