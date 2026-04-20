"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskResult {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  topDrivers: string[];
  shouldTriggerInterventionMode: boolean;
}

interface DigestResult {
  headline: string;
  recommendedNextMove: string;
  leadsGenerated: number;
  leasesSigned: number;
  avgResponseTimeMin: number;
  biggestProblem: string;
  biggestOpportunity: string;
}

interface ActionItem {
  id: string;
  title: string;
  action_type: string;
  urgency: "low" | "medium" | "high" | "critical";
  reason: string;
  property_id?: string;
}

interface NarrativeResult {
  headline: string;
  explanation: string;
  recommendedAction: string;
  impactLevel: string;
}

// ─── Mock defaults (shown before API load) ───────────────────────────────────

const MOCK_RISK: RiskResult = {
  riskScore: 34,
  riskLevel: "medium",
  topDrivers: ["3 stalled applications past 5 days", "Conversion rate dropped 8% this week"],
  shouldTriggerInterventionMode: false,
};

const MOCK_DIGEST: DigestResult = {
  headline: "Strong week — 3 leases, but application pipeline needs attention.",
  recommendedNextMove: "Follow up with Carlos Reyes and Aisha Patel on stalled applications before Friday.",
  leadsGenerated: 11,
  leasesSigned: 3,
  avgResponseTimeMin: 1.1,
  biggestProblem: "2 applications stalled at step 2 for 5+ days",
  biggestOpportunity: "4 high-intent leads not yet booked for tours",
};

const MOCK_ACTIONS: ActionItem[] = [
  { id: "a1", title: "Follow up with Aisha Patel — application stalled", action_type: "review_handoffs", urgency: "high",   reason: "Step 2 of 4 stalled for 6 days. Risk of losing a qualified applicant." },
  { id: "a2", title: "Strengthen offer for The Monroe — occupancy at risk", action_type: "strengthen_offer", urgency: "high",   reason: "Forecast shows 30-day occupancy dipping below 85% without intervention." },
  { id: "a3", title: "Prioritize 4 high-intent leads for tour booking",   action_type: "prioritize_leads",  urgency: "medium", reason: "Lead scores ≥8 but no tour scheduled. Window closes in 48–72hrs." },
  { id: "a4", title: "Increase follow-up cadence for Derek Nguyen",       action_type: "increase_follow_up", urgency: "medium", reason: "3 touches with no reply — try a different channel or message angle." },
];

const MOCK_NARRATIVE: NarrativeResult = {
  headline: "Portfolio is healthy but The Monroe needs a push.",
  explanation: "Creekside and Parkview are performing above target. The Monroe has 3 high-intent leads that haven't converted to tours — this is the single biggest lever this week.",
  recommendedAction: "Run Offer Lab on The Monroe and schedule tours with Jordan Ellis and Maya Thompson by Thursday.",
  impactLevel: "high",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_STYLES = {
  low:      { bar: "bg-green-500",  badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",  label: "Low Risk"      },
  medium:   { bar: "bg-amber-400",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",  label: "Medium Risk"   },
  high:     { bar: "bg-red-500",    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",          label: "High Risk"     },
  critical: { bar: "bg-red-600",    badge: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",          label: "Critical Risk" },
};

const URGENCY_DOT: Record<string, string> = {
  high:     "bg-red-400",
  critical: "bg-red-600",
  medium:   "bg-amber-400",
  low:      "bg-gray-300 dark:bg-gray-600",
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  review_handoffs:    "Review",
  strengthen_offer:   "Offer",
  prioritize_leads:   "Leads",
  increase_follow_up: "Follow-up",
  launch_campaign:    "Campaign",
  increase_budget:    "Budget",
  adjust_messaging:   "Messaging",
  human_review:       "Manual",
  pause_campaign:     "Pause",
  decrease_budget:    "Budget",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RiskCard({ data, loading }: { data: RiskResult; loading: boolean }) {
  const style = RISK_STYLES[data.riskLevel];
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Occupancy Risk</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-2xl font-bold tabular-nums ${data.riskScore >= 70 ? "text-red-500" : data.riskScore >= 40 ? "text-amber-500" : "text-green-500"}`}>{data.riskScore}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>{style.label}</span>
          </div>
        </div>
        {data.shouldTriggerInterventionMode && (
          <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse">⚠ Intervene</span>
        )}
      </div>
      <div className="mb-3 h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/10">
        <div className={`h-1.5 rounded-full ${style.bar} transition-all`} style={{ width: `${data.riskScore}%` }} />
      </div>
      <div className="space-y-1">
        {data.topDrivers.slice(0, 2).map((d, i) => (
          <p key={i} className="flex items-start gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
            {d}
          </p>
        ))}
      </div>
      {loading && <div className="mt-3 h-1 w-full animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />}
    </div>
  );
}

function DigestCard({ data, loading }: { data: DigestResult; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Weekly Digest</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-3">{data.headline}</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Leads",     value: data.leadsGenerated },
          { label: "Leases",    value: data.leasesSigned },
          { label: "Resp. min", value: data.avgResponseTimeMin.toFixed(1) },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-gray-50 dark:bg-white/5 px-2 py-2 text-center">
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-3 py-2">
        <p className="text-[11px] font-semibold text-[#C8102E] dark:text-[#e85c76] mb-0.5">Next move</p>
        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{data.recommendedNextMove}</p>
      </div>
      {loading && <div className="mt-3 h-1 w-full animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />}
    </div>
  );
}

function NarrativeCard({ data, loading }: { data: NarrativeResult; loading: boolean }) {
  const impactColors: Record<string, string> = {
    high:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low:    "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400",
  };
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">AI Narrative</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${impactColors[data.impactLevel] ?? impactColors.low}`}>
          {data.impactLevel} impact
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-2">{data.headline}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{data.explanation}</p>
      <div className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2">
        <span className="text-[#C8102E] text-xs mt-0.5 shrink-0">→</span>
        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{data.recommendedAction}</p>
      </div>
      {loading && <div className="mt-3 h-1 w-full animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />}
    </div>
  );
}

function ActionQueuePanel({
  actions,
  loading,
  onApprove,
  onDismiss,
}: {
  actions: ActionItem[];
  loading: boolean;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const visible = actions.filter(a => a.urgency === "high" || a.urgency === "critical")
    .concat(actions.filter(a => a.urgency === "medium" || a.urgency === "low"))
    .slice(0, 5);

  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1F2E] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4 dark:border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Action Queue</h3>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Recommended actions · approve or dismiss each one</p>
        </div>
        <span className="rounded-full bg-[#C8102E] px-2.5 py-0.5 text-xs font-bold text-white">{visible.length}</span>
      </div>

      {loading ? (
        <div className="space-y-3 px-6 py-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">All caught up</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">No pending actions right now</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-white/5">
          {visible.map(action => (
            <div key={action.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-4 sm:px-6">
              <span className={`mt-1.5 hidden h-2 w-2 shrink-0 rounded-full sm:block ${URGENCY_DOT[action.urgency]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2 mb-1 flex-wrap">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full sm:hidden ${URGENCY_DOT[action.urgency]}`} />
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{action.title}</p>
                  <span className="rounded bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 shrink-0">
                    {ACTION_TYPE_LABELS[action.action_type] ?? action.action_type}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{action.reason}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start">
                <button
                  onClick={() => onApprove(action.id)}
                  className="rounded-lg bg-[#C8102E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A50D25] transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => onDismiss(action.id)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:border-white/10 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function IntelligenceSection() {
  const [risk, setRisk] = useState<RiskResult>(MOCK_RISK);
  const [digest, setDigest] = useState<DigestResult>(MOCK_DIGEST);
  const [narrative, setNarrative] = useState<NarrativeResult>(MOCK_NARRATIVE);
  const [actions, setActions] = useState<ActionItem[]>(MOCK_ACTIONS);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    try {
      const [riskRes, queueRes] = await Promise.all([
        fetch("/api/intelligence/risk?property_id=prop-1&include=risk,digest,narrative"),
        fetch("/api/intelligence/action-queue?limit=5"),
      ]);
      const riskData  = await riskRes.json();
      const queueData = await queueRes.json();

      if (riskData.risk)      setRisk(riskData.risk);
      if (riskData.digest)    setDigest(riskData.digest);
      if (riskData.narrative) setNarrative(riskData.narrative);
      if (queueData.actions)  setActions(queueData.actions);
      setLastRun(new Date().toLocaleTimeString());
    } catch {
      // keep mock data on failure
    } finally {
      setLoading(false);
    }
  }

  function handleApprove(id: string) {
    fetch("/api/intelligence/action-queue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_id: id, operation: "approve" }),
    }).catch(() => {});
    setActions(prev => prev.filter(a => a.id !== id));
  }

  function handleDismiss(id: string) {
    fetch("/api/intelligence/action-queue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_id: id, operation: "dismiss" }),
    }).catch(() => {});
    setActions(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#C8102E] text-sm">✦</span>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Intelligence</h2>
          {lastRun && <span className="text-[10px] text-gray-400 dark:text-gray-500">Updated {lastRun}</span>}
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="rounded-lg bg-[#C8102E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#A50D25] disabled:opacity-50 transition-colors"
        >
          {loading ? "Analyzing…" : "Run Analysis →"}
        </button>
      </div>

      {/* 3-card strip */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RiskCard     data={risk}      loading={loading} />
        <DigestCard   data={digest}    loading={loading} />
        <NarrativeCard data={narrative} loading={loading} />
      </div>

      {/* Action queue */}
      <ActionQueuePanel
        actions={actions}
        loading={loading}
        onApprove={handleApprove}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
