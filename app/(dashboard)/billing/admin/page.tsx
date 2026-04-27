"use client";

import { useState, useEffect, useCallback } from "react";
import { getOperatorEmail, authFetch } from "@/lib/demo-auth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OperatorRow {
  id:                   string;
  name:                 string;
  email:                string;
  stripe_customer_id:   string | null;
  subscription_status:  string;
  meta_ad_account_id:   string | null;
  google_ads_customer_id: string | null;
}

interface SubRow {
  marketing_addon:          boolean;
  marketing_fee:            number;
  performance_fee_per_lease: number;
  status:                   string;
}

interface PeriodRow {
  total_due:          number;
  status:             string;
  stripe_invoice_id:  string | null;
  stripe_invoice_url: string | null;
}

interface OperatorSummary {
  operator:          OperatorRow;
  subscription:      SubRow | null;
  period:            PeriodRow | null;
  billing_month:     string;
  lease_count:       number;
  performance_total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cents(n: number): string {
  return `$${(n / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function monthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ── OperatorCard ──────────────────────────────────────────────────────────────

function OperatorCard({
  summary,
  adminEmail,
  onInvoiced,
}: {
  summary:    OperatorSummary;
  adminEmail: string;
  onInvoiced: () => void;
}) {
  const { operator, subscription, period, lease_count, performance_total } = summary;

  const hasMarketing  = subscription?.marketing_addon ?? false;
  const marketingBase = subscription?.marketing_fee ?? 50000;
  const alreadyBilled = !!period?.stripe_invoice_id;
  const noStripe      = !operator.stripe_customer_id;

  const estimatedAdFee = hasMarketing ? "(pulled from Meta + Google at billing time)" : null;

  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState<{ url: string | null; total: number } | null>(null);
  const [err,     setErr]     = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setErr(null);
    try {
      const res = await fetch("/api/billing/run-monthly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail,
        },
        body: JSON.stringify({ operator_id: operator.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error ?? "Billing failed");
        return;
      }
      const r = json.results?.[0];
      if (r?.skipped) {
        setErr(`Skipped: ${r.skipped}`);
      } else {
        setResult({ url: r?.invoice_url ?? null, total: r?.total_cents ?? 0 });
        onInvoiced();
      }
    } catch {
      setErr("Network error — try again");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-[#1C1F2E] p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="font-black text-white text-lg">{operator.name}</p>
          <p className="text-sm text-gray-500">{operator.email}</p>
        </div>
        <div className="flex gap-2">
          {hasMarketing && (
            <span className="rounded-full bg-purple-900/30 px-2.5 py-0.5 text-[11px] font-bold text-purple-400">
              Marketing Add-on
            </span>
          )}
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            operator.subscription_status === "active"
              ? "bg-green-900/30 text-green-400"
              : "bg-blue-900/30 text-blue-400"
          }`}>
            {operator.subscription_status}
          </span>
        </div>
      </div>

      {/* Fee breakdown */}
      <div className="rounded-lg border border-white/5 bg-[#13151F] p-4 mb-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Performance fees</span>
          <span className="text-white font-semibold">
            {lease_count} lease{lease_count !== 1 ? "s" : ""} × ${(subscription?.performance_fee_per_lease ?? 20000) / 100} = {cents(performance_total)}
          </span>
        </div>
        {hasMarketing && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-400">Marketing base</span>
              <span className="text-white font-semibold">{cents(marketingBase)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ad spend fee (5%)</span>
              <span className="text-gray-400 italic text-xs">{estimatedAdFee}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-gray-500">
                {operator.meta_ad_account_id
                  ? `Meta: ${operator.meta_ad_account_id}`
                  : "⚠ No Meta account ID"
                }
              </span>
              <span className="text-[11px] text-gray-500">
                {operator.google_ads_customer_id
                  ? `Google: ${operator.google_ads_customer_id}`
                  : "⚠ No Google account ID"
                }
              </span>
            </div>
          </>
        )}
        <div className="border-t border-white/5 pt-2 flex justify-between">
          <span className="font-bold text-white">Est. variable total</span>
          <span className="font-black text-white">
            {hasMarketing
              ? `${cents(performance_total + marketingBase)} + ad spend fee`
              : cents(performance_total)
            }
          </span>
        </div>
      </div>

      {/* Status / action */}
      {alreadyBilled ? (
        <div className="flex items-center justify-between rounded-lg bg-green-900/20 border border-green-900/30 px-4 py-3">
          <p className="text-sm font-semibold text-green-400">Invoice sent — {cents(period!.total_due)}</p>
          {period?.stripe_invoice_url && (
            <a
              href={period.stripe_invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-400 underline hover:text-green-300"
            >
              View invoice →
            </a>
          )}
        </div>
      ) : result ? (
        <div className="flex items-center justify-between rounded-lg bg-green-900/20 border border-green-900/30 px-4 py-3">
          <p className="text-sm font-semibold text-green-400">Invoice sent — {cents(result.total)}</p>
          {result.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-400 underline hover:text-green-300"
            >
              View invoice →
            </a>
          )}
        </div>
      ) : (
        <>
          {err && (
            <p className="mb-3 rounded-lg bg-red-900/20 border border-red-900/30 px-4 py-2 text-sm text-red-400">
              {err}
            </p>
          )}
          <button
            onClick={handleRun}
            disabled={running || noStripe}
            title={noStripe ? "Operator has no Stripe customer yet" : undefined}
            className="w-full rounded-xl bg-[#C8102E] py-3 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {running ? "Generating invoice…" : "Generate & Charge Invoice"}
          </button>
          {noStripe && (
            <p className="mt-2 text-center text-xs text-gray-600">
              Operator has not completed Stripe checkout yet
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BillingAdminPage() {
  const [adminEmail, setAdminEmail]   = useState<string | null>(null);
  const [summary,    setSummary]      = useState<OperatorSummary[] | null>(null);
  const [month,      setMonth]        = useState<string>("");
  const [loading,    setLoading]      = useState(true);
  const [forbidden,  setForbidden]    = useState(false);

  const expectedAdmin = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const load = useCallback(async (_email: string) => {
    setLoading(true);
    const res = await authFetch("/api/billing/admin-summary");
    if (res.status === 401) { setForbidden(true); setLoading(false); return; }
    const json = await res.json();
    setSummary(json.summary ?? []);
    setMonth(json.billing_month ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    getOperatorEmail().then(email => {
      if (!email) { setForbidden(true); setLoading(false); return; }
      setAdminEmail(email);
      load(email);
    });
  }, [load]);

  if (forbidden) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0E1017]">
        <p className="text-gray-500">Access denied — admin only</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0E1017]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Admin</p>
          <h1 className="text-3xl font-black text-white">Monthly Billing</h1>
          {month && (
            <p className="mt-1 text-gray-400 text-sm">
              Billing period: <span className="text-white font-semibold">{monthLabel(month)}</span>
              {" · "}Cron runs automatically on the 1st of each month
            </p>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-56 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : summary?.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-[#1C1F2E] p-10 text-center">
            <p className="text-gray-500">No active operators to bill</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(summary ?? []).map(s => (
              <OperatorCard
                key={s.operator.id}
                summary={s}
                adminEmail={adminEmail ?? ""}
                onInvoiced={() => adminEmail && load(adminEmail)}
              />
            ))}
          </div>
        )}

        {/* Info footer */}
        <div className="mt-10 rounded-xl border border-white/5 bg-[#1C1F2E] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">How it works</p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><span className="text-white">Automatic:</span> Vercel cron fires on the 1st of each month at 08:00 UTC and runs billing for all active operators.</li>
            <li><span className="text-white">Manual override:</span> Use the buttons above to bill a specific operator early or re-run if the cron failed.</li>
            <li><span className="text-white">Ad spend:</span> Pulled live from Meta Marketing API + Google Ads API at invoice time using each operator{"'"}s stored account IDs.</li>
            <li><span className="text-white">Charges:</span> Stripe auto-charges the card on file. Operators receive a Stripe-hosted invoice by email.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
