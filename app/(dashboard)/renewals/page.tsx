"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOperatorEmail, authFetch } from "@/lib/demo-auth";

interface Renewal {
  id: string;
  unit_name: string;
  unit_type: string | null;
  lease_end: string;
  days_left: number;
  monthly_rent: number | null;
  current_resident: string | null;
  property_id: string;
  property_name: string;
  urgency: "critical" | "warning" | "upcoming";
  flightRisk?: "high" | "medium" | "low";
  flightScore?: number;
}

function computeFlightRisk(r: Omit<Renewal, "flightRisk" | "flightScore">): { risk: "high" | "medium" | "low"; score: number } {
  let score = 0;
  // Days left — closer to end = higher risk
  if (r.days_left <= 30)      score += 45;
  else if (r.days_left <= 60) score += 25;
  else                        score += 10;
  // Higher rent = more likely to shop around
  if (r.monthly_rent && r.monthly_rent >= 2500) score += 20;
  else if (r.monthly_rent && r.monthly_rent >= 1800) score += 10;
  // Unit type — larger units have more options
  if (r.unit_type === "3br" || r.unit_type === "4br") score += 15;
  else if (r.unit_type === "2br") score += 8;
  // Missing resident name = likely not engaged
  if (!r.current_resident) score += 10;
  return {
    score,
    risk: score >= 60 ? "high" : score >= 35 ? "medium" : "low",
  };
}

type SendState = "idle" | "generating" | "preview" | "sending" | "sent" | "error";

interface SendFlow {
  renewal: Renewal;
  offer: string;
  phone: string;
  message: string;
  state: SendState;
}

function UrgencyBadge({ urgency, daysLeft }: { urgency: Renewal["urgency"]; daysLeft: number }) {
  const styles = {
    critical: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    warning:  "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[urgency]}`}>
      {daysLeft}d left
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 dark:bg-white/5 ${className ?? ""}`} />;
}

const FLIGHT_RISK_STYLE = {
  high:   { badge: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",   label: "High Flight Risk",   dot: "bg-red-500" },
  medium: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", label: "Medium Risk", dot: "bg-amber-500" },
  low:    { badge: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400", label: "Low Risk",    dot: "bg-green-500" },
};

function RenewalRow({ renewal, onSend }: { renewal: Renewal; onSend: (r: Renewal) => void }) {
  const leaseDate = new Date(renewal.lease_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fr = renewal.flightRisk ?? "low";
  const frStyle = FLIGHT_RISK_STYLE[fr];

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-[#1C1F2E] transition-colors ${
      renewal.urgency === "critical" ? "border-red-200 dark:border-red-900/40" :
      renewal.urgency === "warning"  ? "border-amber-200 dark:border-amber-900/40" :
                                       "border-gray-100 dark:border-white/5"
    }`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {renewal.current_resident || "Resident"} — {renewal.unit_name}
              {renewal.unit_type && <span className="text-gray-400 font-normal"> ({renewal.unit_type})</span>}
            </p>
            <UrgencyBadge urgency={renewal.urgency} daysLeft={renewal.days_left} />
            {fr !== "low" && (
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${frStyle.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${frStyle.dot}`} />
                {frStyle.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{renewal.property_name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span>Expires <strong className="text-gray-600 dark:text-gray-300">{leaseDate}</strong></span>
            {renewal.monthly_rent && (
              <span>Rent <strong className="text-gray-600 dark:text-gray-300">${renewal.monthly_rent.toLocaleString()}/mo</strong></span>
            )}
            {renewal.flightScore !== undefined && (
              <span>Risk score <strong className={renewal.flightScore >= 60 ? "text-red-600" : renewal.flightScore >= 35 ? "text-amber-600" : "text-green-600"}>{renewal.flightScore}/100</strong></span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/properties/${renewal.property_id}`}
            className="flex-1 sm:flex-none rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-center text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5 transition-colors">
            View Property
          </Link>
          <button onClick={() => onSend(renewal)}
            className="flex-1 sm:flex-none rounded-lg bg-[#C8102E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#A50D25] transition-colors"
            style={{ boxShadow: "0 2px 8px rgba(200,16,46,0.2)" }}>
            Send Renewal →
          </button>
        </div>
      </div>
    </div>
  );
}

function SendModal({ flow, onChange, onClose }: {
  flow: SendFlow;
  onChange: (updates: Partial<SendFlow>) => void;
  onClose: () => void;
}) {
  const r = flow.renewal;

  async function generateMessage() {
    onChange({ state: "generating" });
    try {
      const res = await fetch("/api/renewals/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id:          r.id,
          tenant_name:      r.current_resident ?? "",
          unit_name:        r.unit_name,
          property_name:    r.property_name,
          lease_end:        r.lease_end,
          monthly_rent:     r.monthly_rent,
          phone:            "preview_only",
          renewal_offer:    flow.offer,
        }),
      });
      const data = await res.json();
      onChange({ state: "preview", message: data.message });
    } catch {
      onChange({ state: "error" });
    }
  }

  async function sendMessage() {
    if (!flow.phone) return;
    onChange({ state: "sending" });
    try {
      const res = await fetch("/api/renewals/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id:       r.id,
          tenant_name:   r.current_resident ?? "",
          unit_name:     r.unit_name,
          property_name: r.property_name,
          lease_end:     r.lease_end,
          monthly_rent:  r.monthly_rent,
          phone:         flow.phone,
          renewal_offer: flow.offer,
        }),
      });
      await res.json();
      onChange({ state: "sent" });
    } catch {
      onChange({ state: "error" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1C1F2E]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/5">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Send Renewal Offer</h2>
            <p className="text-xs text-gray-500 mt-0.5">{r.current_resident || "Resident"} · {r.unit_name} · {r.property_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {flow.state === "sent" ? (
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl dark:bg-green-900/30">✓</div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Renewal offer sent!</p>
            <p className="text-sm text-gray-500">The tenant will receive your SMS renewal offer shortly.</p>
            <button onClick={onClose} className="mt-2 rounded-lg bg-[#C8102E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25]">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Renewal offer */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Renewal Terms <span className="text-gray-400 font-normal">(optional — leave blank for same rate)</span>
              </label>
              <input
                value={flow.offer}
                onChange={e => onChange({ offer: e.target.value })}
                placeholder="e.g. Same rent locked for 12 months, or 5% increase on month-to-month"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Tenant Phone Number</label>
              <input
                type="tel"
                value={flow.phone}
                onChange={e => onChange({ phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-mono dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
              />
            </div>

            {flow.state === "idle" && (
              <button
                onClick={generateMessage}
                className="w-full rounded-xl bg-gray-900 dark:bg-white py-3 text-sm font-semibold text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
              >
                Generate AI Message →
              </button>
            )}

            {flow.state === "generating" && (
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-4">
                <div className="h-5 w-5 rounded-full border-2 border-[#C8102E]/20 border-t-[#C8102E] animate-spin shrink-0" />
                <p className="text-sm text-gray-500">AI is crafting the perfect renewal message…</p>
              </div>
            )}

            {flow.state === "preview" && (
              <>
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span>AI-Generated Message</span>
                    <button onClick={generateMessage} className="text-xs text-[#C8102E] hover:underline">Regenerate</button>
                  </label>
                  <textarea
                    value={flow.message}
                    onChange={e => onChange({ message: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">{flow.message.length} characters · Edit freely before sending</p>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!flow.phone || !flow.message}
                  className="w-full rounded-xl bg-[#C8102E] py-3 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
                  style={{ boxShadow: "0 4px 16px rgba(200,16,46,0.25)" }}
                >
                  Send SMS →
                </button>
              </>
            )}

            {flow.state === "sending" && (
              <div className="flex items-center justify-center gap-3 py-4">
                <div className="h-5 w-5 rounded-full border-2 border-[#C8102E]/20 border-t-[#C8102E] animate-spin" />
                <p className="text-sm text-gray-500">Sending…</p>
              </div>
            )}

            {flow.state === "error" && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                Something went wrong. Please try again.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RenewalsPage() {
  const router = useRouter();
  const [renewals, setRenewals]   = useState<Renewal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"all" | "critical" | "warning" | "upcoming" | "flight_risk">("all");
  const [sendFlow, setSendFlow]   = useState<SendFlow | null>(null);
  const [sentIds, setSentIds]     = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const email = await getOperatorEmail();
        if (!email) { router.push("/setup"); return; }
        const res = await authFetch(`/api/renewals`);
        const json = await res.json();
        const enriched: Renewal[] = (json.renewals ?? []).map((r: Renewal) => {
          const { risk, score } = computeFlightRisk(r);
          return { ...r, flightRisk: risk, flightScore: score };
        });
        setRenewals(enriched);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function openSend(r: Renewal) {
    setSendFlow({ renewal: r, offer: "", phone: "", message: "", state: "idle" });
  }

  function updateFlow(updates: Partial<SendFlow>) {
    setSendFlow(prev => prev ? { ...prev, ...updates } : null);
    if (updates.state === "sent" && sendFlow) {
      setSentIds(prev => new Set([...prev, sendFlow.renewal.id]));
    }
  }

  const filtered = renewals.filter(r => {
    if (sentIds.has(r.id)) return false;
    if (filter === "flight_risk") return r.flightRisk === "high";
    return filter === "all" || r.urgency === filter;
  });

  const counts = {
    critical:    renewals.filter(r => r.urgency === "critical"  && !sentIds.has(r.id)).length,
    warning:     renewals.filter(r => r.urgency === "warning"   && !sentIds.has(r.id)).length,
    upcoming:    renewals.filter(r => r.urgency === "upcoming"  && !sentIds.has(r.id)).length,
    flight_risk: renewals.filter(r => r.flightRisk === "high"  && !sentIds.has(r.id)).length,
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Lease Renewals</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">
            Upcoming lease expirations · Send AI-crafted renewal offers in one click
          </p>
        </div>

        {/* Summary cards */}
        {!loading && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Expiring ≤30d", count: counts.critical, color: "text-red-600 dark:text-red-400",   bg: "bg-red-50 dark:bg-red-900/10",   border: "border-red-200 dark:border-red-900/40" },
              { label: "Expiring 31–60d", count: counts.warning,  color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/10", border: "border-amber-200 dark:border-amber-900/40" },
              { label: "Expiring 61–90d", count: counts.upcoming,  color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/10",   border: "border-blue-200 dark:border-blue-900/40" },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Alert banner */}
        {!loading && counts.critical > 0 && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-900/10">
            <span className="text-red-500 text-lg">⚡</span>
            <p className="text-sm text-red-800 dark:text-red-300">
              <strong>{counts.critical} lease{counts.critical !== 1 ? "s" : ""}</strong> expiring within 30 days.
              Send renewal offers now to avoid vacancy.
            </p>
          </div>
        )}

        {/* Flight risk banner */}
        {!loading && counts.flight_risk > 0 && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-900/10">
            <span className="shrink-0 text-lg">🚨</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800 dark:text-red-300">
                {counts.flight_risk} high flight-risk tenant{counts.flight_risk !== 1 ? "s" : ""} identified
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                These residents are statistically most likely to leave. Reach out with a personalized offer before they sign elsewhere.
              </p>
            </div>
            <button onClick={() => setFilter("flight_risk")}
              className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors">
              View →
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            { key: "all",         label: `All (${renewals.filter(r => !sentIds.has(r.id)).length})` },
            { key: "flight_risk", label: `🚨 High Risk (${counts.flight_risk})` },
            { key: "critical",    label: `≤30 days (${counts.critical})` },
            { key: "warning",     label: `31–60 days (${counts.warning})` },
            { key: "upcoming",    label: `61–90 days (${counts.upcoming})` },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 py-16 text-center">
            <div className="mb-3 text-4xl">🎉</div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">No upcoming expirations</p>
            <p className="mt-1 text-sm text-gray-400">
              {filter === "all"
                ? "All leases are good for 90+ days."
                : "No leases expiring in this window."}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(r => (
              <RenewalRow key={r.id} renewal={r} onSend={openSend} />
            ))}
          </div>
        )}

        {sentIds.size > 0 && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            ✓ {sentIds.size} renewal offer{sentIds.size !== 1 ? "s" : ""} sent this session
          </div>
        )}
      </div>

      {sendFlow && (
        <SendModal
          flow={sendFlow}
          onChange={updateFlow}
          onClose={() => setSendFlow(null)}
        />
      )}
    </div>
  );
}
