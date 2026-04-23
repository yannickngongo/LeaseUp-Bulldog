"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getOperatorEmail } from "@/lib/demo-auth";

interface BillingInfo {
  plan: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
  activated_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    trial:     { label: "Free Trial",   cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
    active:    { label: "Active",       cls: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
    past_due:  { label: "Past Due",     cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
    cancelled: { label: "Cancelled",    cls: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400" },
  };
  const s = map[status ?? "trial"] ?? map.trial;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

const PLAN_DISPLAY: Record<string, { name: string; price: string; perfFee: string; maxProps: string }> = {
  starter:    { name: "Starter",   price: "$500/month",   perfFee: "$200", maxProps: "Up to 3 properties" },
  pro:        { name: "Pro",       price: "$1,500/month", perfFee: "$150", maxProps: "Up to 20 properties" },
  portfolio:  { name: "Portfolio", price: "$3,000/month", perfFee: "$100", maxProps: "Unlimited properties" },
  growth:     { name: "Pro",       price: "$1,500/month", perfFee: "$150", maxProps: "Up to 20 properties" },
  enterprise: { name: "Portfolio", price: "$3,000/month", perfFee: "$100", maxProps: "Unlimited properties" },
  core:       { name: "Starter",   price: "$500/month",   perfFee: "$200", maxProps: "Up to 3 properties" },
};

const FEATURE_NAMES: Record<string, string> = {
  portfolio:   "Portfolio View",
  automations: "Automations",
  competitors: "Competitor Tracking",
  insights:    "Insights",
};

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount_paid: number;
  currency: string;
  created: number;
  pdf_url: string | null;
  hosted_url: string | null;
}

function fmtAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function BillingContent() {
  const searchParams  = useSearchParams();
  const [info, setInfo]       = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [invLoading, setInvLoading] = useState(false);

  const justSucceeded  = searchParams.get("success") === "true";
  const justCancelled  = searchParams.get("cancelled") === "true";
  const needsUpgrade   = searchParams.get("upgrade") === "1";
  const blockedFeature = searchParams.get("feature") ?? "";

  useEffect(() => {
    getOperatorEmail().then(async email => {
      if (!email) { setLoading(false); return; }
      const res = await fetch(`/api/setup?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      const op = json.operator;
      if (op) {
        setInfo({
          plan:                   op.plan ?? "starter",
          subscription_status:    op.subscription_status ?? "trial",
          trial_ends_at:          op.trial_ends_at ?? null,
          activated_at:           op.activated_at ?? null,
          stripe_customer_id:     op.stripe_customer_id ?? null,
          stripe_subscription_id: op.stripe_subscription_id ?? null,
        });
        // Fetch invoices if they have a Stripe customer
        if (op.stripe_customer_id) {
          setInvLoading(true);
          fetch(`/api/billing/invoices?email=${encodeURIComponent(email)}`)
            .then(r => r.json())
            .then(d => setInvoices(d.invoices ?? []))
            .catch(() => {})
            .finally(() => setInvLoading(false));
        }
      }
      setLoading(false);
    });
  }, []);

  async function handleUpgrade() {
    setWorking(true);
    const res  = await fetch("/api/stripe/checkout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan: planSlug }),
    });
    const json = await res.json();
    if (json.url) window.location.href = json.url;
    else { alert("Could not start checkout. Please try again."); setWorking(false); }
  }

  async function handleManage() {
    setWorking(true);
    const res  = await fetch("/api/stripe/portal", { method: "POST" });
    const json = await res.json();
    if (json.url) window.location.href = json.url;
    else { alert("Could not open billing portal. Please try again."); setWorking(false); }
  }

  const planSlug      = info?.plan ?? "starter";
  const planDisplay   = PLAN_DISPLAY[planSlug] ?? PLAN_DISPLAY.starter;
  const trialDays     = daysUntil(info?.trial_ends_at ?? null);
  const isTrialing    = info?.subscription_status === "trial" || (!info?.subscription_status && trialDays !== null && trialDays > 0);
  const isActive      = info?.subscription_status === "active";
  const isPastDue     = info?.subscription_status === "past_due";
  const hasBilling    = Boolean(info?.stripe_customer_id);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0E1017]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">

        <h1 className="mb-6 text-2xl font-black text-gray-900 dark:text-gray-100">Billing & Plan</h1>

        {/* Upgrade required banner — shown when middleware redirects here */}
        {needsUpgrade && (
          <div className="mb-5 rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-900/10 px-5 py-4 flex items-start gap-3">
            <span className="text-xl shrink-0">🔒</span>
            <div>
              <p className="font-semibold text-violet-700 dark:text-violet-400">
                {FEATURE_NAMES[blockedFeature] ?? "This feature"} requires a Pro or Portfolio plan
              </p>
              <p className="text-sm text-violet-600 dark:text-violet-500 mt-0.5">
                Upgrade your plan below to unlock {FEATURE_NAMES[blockedFeature]?.toLowerCase() ?? "this feature"} and all advanced tools.
              </p>
            </div>
          </div>
        )}

        {/* Success / cancelled banners */}
        {justSucceeded && (
          <div className="mb-5 rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/10 px-5 py-4">
            <p className="font-semibold text-green-700 dark:text-green-400">🎉 You&apos;re all set! Your subscription is now active.</p>
            <p className="text-sm text-green-600 dark:text-green-500 mt-0.5">AI follow-up is live on all your properties. Welcome to LeaseUp Bulldog {planDisplay.name}.</p>
          </div>
        )}
        {justCancelled && (
          <div className="mb-5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1F2E] px-5 py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">Checkout was cancelled — no charge was made. Click Upgrade any time to subscribe.</p>
          </div>
        )}
        {isPastDue && (
          <div className="mb-5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-5 py-4">
            <p className="font-semibold text-amber-700 dark:text-amber-400">Payment failed — your plan is past due.</p>
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-0.5">Update your payment method to keep AI follow-up active.</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}
          </div>
        ) : (
          <div className="space-y-4">

            {/* Current plan card */}
            <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Current Plan</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-gray-100">LeaseUp Bulldog {planDisplay.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{planDisplay.price} + {planDisplay.perfFee}/lease · {planDisplay.maxProps} · cancel any time</p>
                </div>
                <StatusBadge status={info?.subscription_status ?? "trial"} />
              </div>

              {isTrialing && trialDays !== null && (
                <div className="mt-4 rounded-lg border border-blue-100 dark:border-blue-900/20 bg-blue-50 dark:bg-blue-900/10 px-4 py-3">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    {trialDays > 0 ? `${trialDays} day${trialDays !== 1 ? "s" : ""} left in your free trial` : "Your free trial has ended"}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    {trialDays > 0 ? "Upgrade before your trial ends to keep AI follow-up running 24/7." : "Upgrade now to re-activate AI responses."}
                  </p>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                {!isActive && (
                  <button
                    onClick={handleUpgrade}
                    disabled={working}
                    className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
                  >
                    {working ? "Loading…" : isTrialing ? "Upgrade Now →" : "Subscribe →"}
                  </button>
                )}
                {hasBilling && (
                  <button
                    onClick={handleManage}
                    disabled={working}
                    className="rounded-xl border border-gray-200 dark:border-white/10 px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
                  >
                    {working ? "Loading…" : "Manage Billing"}
                  </button>
                )}
              </div>
            </div>

            {/* What's included */}
            <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">What&apos;s Included</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "AI SMS follow-up within 60 seconds",
                  "Unlimited leads across all properties",
                  "Pipeline Kanban & tour scheduling",
                  "Owner-ready PDF reports",
                  "Zillow, Apartments.com & Facebook leads",
                  "Competitor rent tracking",
                  "Two-way SMS conversation loop",
                  "Escalation detection & handoff alerts",
                  "Occupancy gap dashboard",
                  "Automated follow-up sequences",
                ].map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="mt-0.5 text-green-500 shrink-0">✓</span>{f}
                  </div>
                ))}
              </div>
            </div>

            {/* Performance fee note */}
            <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Performance Fee</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                A <strong className="text-gray-900 dark:text-gray-100">{planDisplay.perfFee} performance fee</strong> applies per lease signed through LUB within the 30-day attribution window.
                This is tracked automatically when you mark a lead as &quot;Won&quot;.
              </p>
            </div>

            {/* Invoice history */}
            {(invLoading || invoices.length > 0) && (
              <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Invoice History</p>
                {invLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg animate-pulse bg-gray-100 dark:bg-white/5" />)}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-white/5">
                    {invoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between py-3 gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {fmtAmount(inv.amount_paid, inv.currency)}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(inv.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {inv.number ? ` · ${inv.number}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            inv.status === "paid"
                              ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                              : inv.status === "open"
                              ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                              : "bg-gray-100 dark:bg-white/5 text-gray-500"
                          }`}>
                            {inv.status ?? "—"}
                          </span>
                          {inv.pdf_url && (
                            <a href={inv.pdf_url} target="_blank" rel="noreferrer"
                              className="text-xs font-semibold text-[#C8102E] hover:underline">
                              PDF
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-gray-50 dark:bg-[#0E1017]" />}>
      <BillingContent />
    </Suspense>
  );
}
