"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getOperatorEmail } from "@/lib/demo-auth";

interface Props {
  leadId:                 string;
  propertyId:             string;
  operatorId:             string;
  leadStatus:             string;
  firstContactDate:       string | null;
  attributionWindowEnd:   string | null;
  performanceFeePerLease: number; // cents
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusMonthsISO(isoDate: string, months: number): string {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function MarkLeaseSignedButton({
  leadId,
  propertyId,
  operatorId,
  leadStatus,
  firstContactDate,
  attributionWindowEnd,
  performanceFeePerLease,
}: Props) {
  const router = useRouter();
  const [open, setOpen]                       = useState(false);
  const [signedDate, setSignedDate]           = useState(todayISO());
  const [unitNumber, setUnitNumber]           = useState("");
  const [rentDollars, setRentDollars]         = useState("");
  const [leaseStart, setLeaseStart]           = useState(todayISO());
  const [leaseEnd, setLeaseEnd]               = useState(plusMonthsISO(todayISO(), 12));
  const [attributionSource, setAttribution]   = useState<"lub" | "manual" | "other">("lub");
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState("");

  const alreadyWon = leadStatus === "won";

  // Compute attribution status (mirrors backend evaluateAttribution())
  const isWithinWindow = !!attributionWindowEnd && new Date(signedDate) <= new Date(attributionWindowEnd);
  const isBillable     = attributionSource === "lub" && isWithinWindow;
  const feeDollars     = (performanceFeePerLease / 100).toFixed(0);

  async function handleSubmit() {
    setError("");
    if (!signedDate)     { setError("Lease signed date required"); return; }
    if (!rentDollars)    { setError("Monthly rent required"); return; }
    const rentNum = parseFloat(rentDollars);
    if (Number.isNaN(rentNum) || rentNum <= 0) { setError("Invalid rent amount"); return; }

    setSubmitting(true);
    try {
      const email = await getOperatorEmail();
      const res   = await authFetch("/api/leases", {
        method: "POST",
        body: {
          lead_id:            leadId,
          property_id:        propertyId,
          operator_id:        operatorId,
          lease_signed_date:  signedDate,
          rent_amount:        Math.round(rentNum * 100),  // dollars → cents
          unit_number:        unitNumber.trim() || undefined,
          lease_start_date:   leaseStart || undefined,
          lease_end_date:     leaseEnd || undefined,
          attribution_source: attributionSource,
          created_by:         email ?? "unknown",
        },
      });
      const json = await res.json() as { lease?: unknown; error?: string | Record<string, string[]> };
      if (!res.ok) {
        const msg = typeof json.error === "string"
          ? json.error
          : json.error
          ? Object.values(json.error).flat().join(", ")
          : "Failed to record lease";
        setError(msg);
        return;
      }
      setOpen(false);
      router.refresh();  // Re-fetch the server component with updated lead status
    } catch {
      setError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (alreadyWon) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/20 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
        ✓ Lease Recorded
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A50D25] transition-colors"
        style={{ boxShadow: "0 4px 12px rgba(200,16,46,0.20)" }}
      >
        Mark Lease Signed →
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto" onClick={() => !submitting && setOpen(false)}>
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-[#1C1F2E] my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-6 py-4">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">Record signed lease</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">All amounts in USD</p>
              </div>
              <button
                onClick={() => !submitting && setOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                disabled={submitting}
              >×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Attribution panel */}
              <div className={`rounded-xl border p-3 text-xs ${
                isBillable
                  ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/10"
                  : "border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
              }`}>
                <p className="font-semibold mb-1">
                  {firstContactDate
                    ? <>✓ LUB AI first contacted on <strong>{fmtDate(firstContactDate)}</strong></>
                    : <>⚠ No AI contact recorded for this lead</>
                  }
                </p>
                {attributionWindowEnd && (
                  <p className="text-gray-600 dark:text-gray-400">
                    Attribution window ends: <strong>{fmtDate(attributionWindowEnd)}</strong>
                  </p>
                )}
                <p className={`mt-1.5 font-bold ${isBillable ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"}`}>
                  {attributionSource === "lub" && isWithinWindow
                    ? `→ Billable: \$${feeDollars} performance fee will appear on your next invoice`
                    : attributionSource !== "lub"
                    ? `→ Non-billable: marked as ${attributionSource} attribution — no fee`
                    : `→ Non-billable: lease signed outside the 30-day window — no fee`}
                </p>
              </div>

              {/* Date + unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Lease signed *</label>
                  <input
                    type="date"
                    value={signedDate}
                    onChange={e => setSignedDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Unit #</label>
                  <input
                    type="text"
                    value={unitNumber}
                    onChange={e => setUnitNumber(e.target.value)}
                    placeholder="e.g. 304"
                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Rent */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Monthly rent *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={rentDollars}
                    onChange={e => setRentDollars(e.target.value)}
                    placeholder="1850"
                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-7 pr-3 py-2 text-sm dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Lease term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Lease start</label>
                  <input
                    type="date"
                    value={leaseStart}
                    onChange={e => setLeaseStart(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Lease end</label>
                  <input
                    type="date"
                    value={leaseEnd}
                    onChange={e => setLeaseEnd(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Attribution choice */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Attribution</label>
                <div className="space-y-1.5">
                  {[
                    { v: "lub" as const,    label: "LUB qualified this lead",       desc: `If within window: \$${feeDollars} performance fee` },
                    { v: "manual" as const, label: "Came from another source",      desc: "Operator-sourced — no LUB fee" },
                    { v: "other" as const,  label: "Other / not sure",              desc: "No LUB fee" },
                  ].map(o => (
                    <label key={o.v} className={`flex items-start gap-2 rounded-lg border p-2 cursor-pointer transition-colors ${
                      attributionSource === o.v
                        ? "border-[#C8102E] bg-[#C8102E]/5"
                        : "border-gray-200 dark:border-white/10 hover:border-gray-300"
                    }`}>
                      <input
                        type="radio"
                        name="attribution"
                        checked={attributionSource === o.v}
                        onChange={() => setAttribution(o.v)}
                        className="mt-0.5 accent-[#C8102E]"
                      />
                      <div className="flex-1 text-xs">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{o.label}</p>
                        <p className="text-gray-500">{o.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-white/5 px-6 py-3">
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-gray-200 dark:border-white/10 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
              >Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !rentDollars || !signedDate}
                className="rounded-lg bg-[#C8102E] px-5 py-2 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-50 transition-colors"
              >
                {submitting ? "Recording…" : "Record Lease"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
