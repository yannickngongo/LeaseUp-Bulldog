"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/demo-auth";

interface Status {
  hasAccess:    boolean;
  isPro:        boolean;
  status:       "active" | "trialing" | "past_due" | "canceled" | "inactive";
  subscribedAt: string | null;
  endsAt:       string | null;
  hasCustomer:  boolean;
}

function BillingPageInner() {
  const params = useSearchParams();
  const [status, setStatus]     = useState<Status | null>(null);
  const [loading, setLoading]   = useState(true);
  const [working, setWorking]   = useState(false);
  const [error, setError]       = useState("");

  const showSuccess  = params.get("success")  === "true";
  const showCanceled = params.get("canceled") === "true";

  useEffect(() => {
    authFetch("/api/billing/status")
      .then(r => r.json())
      .then(j => setStatus(j as Status))
      .catch(() => setError("Failed to load billing status"))
      .finally(() => setLoading(false));
  }, []);

  async function startCheckout() {
    setWorking(true); setError("");
    try {
      const res  = await authFetch("/api/billing/subscribe", { method: "POST", body: {} });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) { setError(json.error ?? "Failed to start checkout"); setWorking(false); return; }
      window.location.href = json.url;
    } catch { setError("Network error"); setWorking(false); }
  }

  async function openPortal() {
    setWorking(true); setError("");
    try {
      const res  = await authFetch("/api/billing/portal", { method: "POST", body: {} });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) { setError(json.error ?? "Failed to open portal"); setWorking(false); return; }
      window.location.href = json.url;
    } catch { setError("Network error"); setWorking(false); }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-8 w-8 mx-auto mt-20 animate-spin rounded-full border-2 border-gray-200 border-t-[#C8102E]" />
      </div>
    );
  }

  const statusColor: Record<Status["status"], string> = {
    active:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    canceled: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    inactive: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };

  const statusLabel: Record<Status["status"], string> = {
    active:   "Active",
    trialing: "Trialing",
    past_due: "Past Due",
    canceled: "Canceled",
    inactive: "Not Subscribed",
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Billing</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Marketing Add-on subscription &amp; ad spend invoicing</p>
        </div>

        {showSuccess && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            ✓ Subscription activated — you can launch campaigns from the Marketing tab now.
          </div>
        )}
        {showCanceled && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
            Checkout canceled — your card was not charged.
          </div>
        )}

        {/* Pro override banner */}
        {status?.isPro && (
          <div className="mb-5 rounded-xl border border-purple-300 bg-purple-50 dark:border-purple-900/40 dark:bg-purple-900/10 px-4 py-3 text-sm text-purple-700 dark:text-purple-300">
            <strong>Pro Override active</strong> — your email is in <code className="text-xs">PRO_OVERRIDE_EMAILS</code>, so you have full Marketing Add-on access without a Stripe subscription. You can still subscribe below to test the live checkout flow.
          </div>
        )}

        {/* Plan card */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6 mb-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-1">Marketing Add-on</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">$500<span className="text-sm font-normal text-gray-400">/month + 5% of ad spend</span></p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[status?.status ?? "inactive"]}`}>
              {statusLabel[status?.status ?? "inactive"]}
            </span>
          </div>

          <div className="space-y-2 mb-5 text-sm">
            {[
              "AI campaign generation (Facebook, Instagram, Google)",
              "Auto-publishing to your connected ad account",
              "5% fee on actual ad spend (not budget) — billed monthly",
              "Ad spend itself is paid directly to Meta / Google by you",
              "Real-time lead webhook ingestion",
              "AI qualification on every inbound lead",
            ].map(b => (
              <div key={b} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                <span>{b}</span>
              </div>
            ))}
          </div>

          {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

          {status?.hasAccess && status.status === "active" ? (
            <button onClick={openPortal} disabled={working} className="rounded-xl border border-gray-200 dark:border-white/10 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 disabled:opacity-50">
              {working ? "Opening…" : "Manage Subscription →"}
            </button>
          ) : status?.status === "past_due" ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
                Payment failed on your last invoice. Active campaigns have been paused.
              </div>
              <button onClick={openPortal} disabled={working} className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-50">
                {working ? "Opening…" : "Update Payment Method"}
              </button>
            </div>
          ) : (
            <button onClick={startCheckout} disabled={working} className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-50">
              {working ? "Opening Checkout…" : "Subscribe — $500/mo + 5% of ad spend"}
            </button>
          )}
        </div>

        {/* How billing works */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">How billing works</p>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex gap-3">
              <span className="font-bold text-[#C8102E] shrink-0">1.</span>
              <p><strong>You subscribe</strong> here for $500/mo. Stripe charges you monthly on the same date you subscribed.</p>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-[#C8102E] shrink-0">2.</span>
              <p><strong>You launch campaigns</strong> from the Marketing tab. No payment happens at launch — campaigns just go live on your connected Meta/Google ad account.</p>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-[#C8102E] shrink-0">3.</span>
              <p><strong>Meta / Google charge you directly</strong> for the actual ad spend (the credit card you have on file with them, not us).</p>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-[#C8102E] shrink-0">4.</span>
              <p><strong>LUB tracks your actual spend daily</strong> via the ad platform APIs. At the end of each billing cycle, the 5% fee is added to your monthly $500 invoice.</p>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-[#C8102E] shrink-0">5.</span>
              <p><strong>One invoice, two line items.</strong> If you spent $1,000 in ads this month, your invoice is $500 + $50 = $550.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <BillingPageInner />
    </Suspense>
  );
}
