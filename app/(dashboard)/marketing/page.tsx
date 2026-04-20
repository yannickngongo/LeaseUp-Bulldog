"use client";

import { useState, useEffect } from "react";
import { getOperatorEmail } from "@/lib/demo-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignStatus = "pending_approval" | "approved" | "active" | "paused" | "completed";
type AdChannel = "facebook" | "google" | "instagram";

interface AdVariation {
  id: string;
  variation_num: number;
  headline: string;
  primary_text: string;
  cta: string;
  channel: AdChannel;
  approved: boolean;
}

interface Campaign {
  id: string;
  property: string;
  property_id: string;
  operator_id: string;
  status: CampaignStatus;
  messaging_angle: string;
  recommended_channels: AdChannel[];
  urgency: string;
  current_special: string | null;
  created_at: string;
  leads_generated: number;
  variations: AdVariation[];
}

interface OfferLabResult {
  scores: {
    offerStrength: number;
    marketCompetitiveness: number;
    leadAttraction: number;
    conversionPotential: number;
    overall: number;
    explanation: string;
  };
  recommendation: {
    improvedSpecial: string;
    improvedMessagingAngle: string;
    suggestedPositioning: string;
    reasoning: string;
  };
  simulation: {
    userVersion: { expectedLeadIncreasePct: number; expectedApplicationRatePct: number; expectedLeaseConversionPct: number; estimatedOccupancyImpact: number };
    aiVersion:   { expectedLeadIncreasePct: number; expectedApplicationRatePct: number; expectedLeaseConversionPct: number; estimatedOccupancyImpact: number };
    confidenceScore: number;
    comparisonSummary: string;
  };
}

interface OptimizationAction {
  id?: string;
  actionType: string;
  title: string;
  description: string;
  expectedImpact: string;
  autoExecutable: boolean;
  executionStatus: "pending" | "approved" | "executed" | "dismissed";
}

interface OptimizationResult {
  optimizationScore: number;
  summary: string;
  actions: OptimizationAction[];
}

interface WhatIfResult {
  scenarioDescription: string;
  estimatedLeadImpactPct: number;
  estimatedApplicationImpactPct: number;
  estimatedLeaseImpactPct: number;
  estimatedOccupancyImpactPct: number;
  estimatedCostImpactCents: number;
  confidenceScore: number;
  reasoning: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<CampaignStatus, string> = {
  pending_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:         "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  active:           "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paused:           "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400",
  completed:        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  pending_approval: "Pending Approval",
  approved:         "Approved",
  active:           "Active",
  paused:           "Paused",
  completed:        "Completed",
};

const CHANNEL_ICONS: Record<AdChannel, string> = { facebook: "f", google: "G", instagram: "in" };
const CHANNEL_COLORS: Record<AdChannel, string> = { facebook: "bg-blue-600", google: "bg-red-500", instagram: "bg-pink-600" };

function scoreColor(n: number) {
  if (n >= 70) return "bg-green-500";
  if (n >= 40) return "bg-amber-400";
  return "bg-red-400";
}
function scoreText(n: number) {
  if (n >= 70) return "text-green-600 dark:text-green-400";
  if (n >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
function impactArrow(n: number) {
  if (n > 0) return { arrow: "↑", cls: "text-green-600 dark:text-green-400" };
  if (n < 0) return { arrow: "↓", cls: "text-red-500 dark:text-red-400" };
  return { arrow: "→", cls: "text-gray-400" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: AdChannel }) {
  return (
    <span className={`inline-flex items-center justify-center h-5 w-7 rounded text-[10px] font-bold text-white ${CHANNEL_COLORS[channel]}`}>
      {CHANNEL_ICONS[channel]}
    </span>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`text-xs font-bold ${scoreText(value)}`}>{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/10">
        <div className={`h-1.5 rounded-full ${scoreColor(value)} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ─── Intelligence Panels ──────────────────────────────────────────────────────

function OfferLabPanel({ campaign }: { campaign: Campaign }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<OfferLabResult | null>(null);

  async function runOfferLab() {
    setState("loading");
    try {
      const res = await fetch("/api/intelligence/offer-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: campaign.property_id,
          operatorId: campaign.operator_id,
          campaignName: `${campaign.property} Campaign`,
          specialOffer: campaign.current_special ?? "No current offer",
          campaignGoal: "maximize leads and lease conversions",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ scores: data.scores, recommendation: data.recommendation, simulation: data.simulation });
        setState("done");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1C1F2E]">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-5 py-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Offer Lab</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">AI scores your offer and suggests improvements</p>
        </div>
        {state !== "loading" && (
          <button
            onClick={runOfferLab}
            className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A50D25] transition-colors"
          >
            {state === "done" ? "Re-run →" : "Run Offer Lab →"}
          </button>
        )}
      </div>

      {state === "idle" && (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <div className="text-3xl">🧪</div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Score your offer with AI</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Get an offer strength score, AI-improved version, and simulation comparison</p>
        </div>
      )}

      {state === "loading" && (
        <div className="flex flex-col items-center gap-3 px-5 py-10">
          <div className="h-8 w-8 rounded-full border-4 border-[#C8102E]/20 border-t-[#C8102E] animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing your offer…</p>
        </div>
      )}

      {state === "error" && (
        <div className="px-5 py-6 text-center text-sm text-red-500">Failed to run analysis. Check your API key and try again.</div>
      )}

      {state === "done" && result && (
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {/* Score bars */}
          <div className="px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Offer Scores</p>
            <div className="space-y-3">
              <ScoreBar label="Offer Strength"           value={result.scores.offerStrength} />
              <ScoreBar label="Market Competitiveness"   value={result.scores.marketCompetitiveness} />
              <ScoreBar label="Lead Attraction"          value={result.scores.leadAttraction} />
              <ScoreBar label="Conversion Potential"     value={result.scores.conversionPotential} />
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-white/5 px-4 py-3">
              <span className={`text-2xl font-bold ${scoreText(result.scores.overall)}`}>{result.scores.overall}</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{result.scores.explanation}</p>
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">AI Recommendation</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Improved Offer</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{result.recommendation.improvedSpecial}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Messaging Angle</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.recommendation.improvedMessagingAngle}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Positioning</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.recommendation.suggestedPositioning}</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10 px-3 py-2">
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">{result.recommendation.reasoning}</p>
              </div>
            </div>
          </div>

          {/* Simulation comparison */}
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Simulation: Your Offer vs AI Version</p>
              <span className="text-xs text-gray-400 dark:text-gray-500">{result.simulation.confidenceScore}% confidence</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Your Offer",  data: result.simulation.userVersion, border: "border-gray-200 dark:border-white/10" },
                { label: "AI Version",  data: result.simulation.aiVersion,   border: "border-[#C8102E]/30 dark:border-[#C8102E]/20" },
              ].map(col => (
                <div key={col.label} className={`rounded-xl border ${col.border} p-4`}>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">{col.label}</p>
                  {[
                    { label: "Lead increase",      val: col.data.expectedLeadIncreasePct,    suffix: "%" },
                    { label: "Application rate",   val: col.data.expectedApplicationRatePct, suffix: "%" },
                    { label: "Lease conversion",   val: col.data.expectedLeaseConversionPct, suffix: "%" },
                    { label: "Occupancy impact",   val: col.data.estimatedOccupancyImpact,   suffix: "%" },
                  ].map(m => {
                    const { arrow, cls } = impactArrow(m.val);
                    return (
                      <div key={m.label} className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-white/5 last:border-0">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{m.label}</span>
                        <span className={`text-xs font-bold ${cls}`}>{arrow} {Math.abs(m.val)}{m.suffix}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{result.simulation.comparisonSummary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignOptimizePanel({ campaign }: { campaign: Campaign }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, "pending" | "applying" | "done" | "dismissed">>({});

  async function analyze() {
    setState("loading");
    try {
      const res = await fetch("/api/intelligence/campaign-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaign.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ optimizationScore: data.optimizationScore, summary: data.summary, actions: data.actions });
        setState("done");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  async function applyAction(actionId: string) {
    setActionStates(s => ({ ...s, [actionId]: "applying" }));
    try {
      await fetch("/api/intelligence/campaign-optimize", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_id: actionId }),
      });
      setActionStates(s => ({ ...s, [actionId]: "done" }));
    } catch {
      setActionStates(s => ({ ...s, [actionId]: "pending" }));
    }
  }

  function dismissAction(idx: number) {
    if (!result) return;
    const updated = result.actions.map((a, i) => i === idx ? { ...a, executionStatus: "dismissed" as const } : a);
    setResult({ ...result, actions: updated });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1C1F2E]">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-5 py-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Campaign Optimization</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">AI-generated actions to improve performance</p>
        </div>
        {state !== "loading" && (
          <button
            onClick={analyze}
            className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A50D25] transition-colors"
          >
            {state === "done" ? "Re-analyze →" : "Analyze →"}
          </button>
        )}
      </div>

      {state === "idle" && (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <div className="text-3xl">⚡</div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Find what to fix first</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">AI analyzes performance and generates prioritized actions</p>
        </div>
      )}

      {state === "loading" && (
        <div className="flex flex-col items-center gap-3 px-5 py-10">
          <div className="h-8 w-8 rounded-full border-4 border-[#C8102E]/20 border-t-[#C8102E] animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing campaign performance…</p>
        </div>
      )}

      {state === "error" && (
        <div className="px-5 py-6 text-center text-sm text-red-500">Analysis failed. Check your API key and try again.</div>
      )}

      {state === "done" && result && (
        <div className="px-5 py-5 space-y-4">
          {/* Score + summary */}
          <div className="flex items-center gap-4 rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${
              result.optimizationScore >= 70 ? "bg-green-500" : result.optimizationScore >= 40 ? "bg-amber-400" : "bg-red-400"
            }`}>
              {result.optimizationScore}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.summary}</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {result.actions.filter(a => a.executionStatus !== "dismissed").map((action, idx) => {
              const ast = action.id ? (actionStates[action.id] ?? action.executionStatus) : action.executionStatus;
              return (
                <div key={idx} className="rounded-xl border border-gray-100 dark:border-white/5 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{action.title}</p>
                      {action.autoExecutable && (
                        <span className="rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-[10px] font-semibold">Auto-executable</span>
                      )}
                    </div>
                    <button
                      onClick={() => dismissAction(idx)}
                      className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 text-xs shrink-0"
                    >
                      dismiss
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{action.description}</p>
                  <p className="text-xs text-[#C8102E] dark:text-[#e85c76] mb-3">Expected: {action.expectedImpact}</p>

                  {ast === "done" ? (
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Applied</span>
                  ) : ast === "applying" ? (
                    <span className="text-xs text-gray-400">Applying…</span>
                  ) : action.id ? (
                    <button
                      onClick={() => applyAction(action.id!)}
                      className="rounded-lg border border-[#C8102E] px-3 py-1.5 text-xs font-semibold text-[#C8102E] hover:bg-[#C8102E] hover:text-white transition-colors"
                    >
                      Apply →
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function WhatIfPanel({ campaign }: { campaign: Campaign }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [form, setForm] = useState({
    description: "",
    budgetChangePct: "",
    offerChange: "",
    channelSwitch: "",
  });

  async function runSimulation() {
    if (!form.description) return;
    setState("loading");
    const changes: Record<string, unknown> = {};
    if (form.budgetChangePct) {
      const pct = parseFloat(form.budgetChangePct);
      if (pct > 0) changes.budgetIncreasePct = pct;
      else changes.budgetDecreasePct = Math.abs(pct);
    }
    if (form.offerChange) changes.offerChange = form.offerChange;
    if (form.channelSwitch) changes.channelSwitch = form.channelSwitch;

    try {
      const res = await fetch("/api/intelligence/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: campaign.property_id,
          scenario: { description: form.description, changes },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.result);
        setState("done");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1C1F2E]">
      <div className="border-b border-gray-100 dark:border-white/5 px-5 py-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">What-If Simulation</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Simulate a strategy change before committing budget</p>
      </div>

      <div className="px-5 py-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Scenario Description *</label>
          <input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="e.g. What if I doubled my Facebook budget and added a free parking offer?"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Budget Change %</label>
            <input
              value={form.budgetChangePct}
              onChange={e => setForm(f => ({ ...f, budgetChangePct: e.target.value }))}
              placeholder="+20 or -10"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Offer Change</label>
            <input
              value={form.offerChange}
              onChange={e => setForm(f => ({ ...f, offerChange: e.target.value }))}
              placeholder="e.g. free parking"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Channel Switch</label>
            <input
              value={form.channelSwitch}
              onChange={e => setForm(f => ({ ...f, channelSwitch: e.target.value }))}
              placeholder="e.g. Google Ads"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={runSimulation}
            disabled={!form.description || state === "loading"}
            className="rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
          >
            {state === "loading" ? "Simulating…" : "Run Simulation →"}
          </button>
        </div>

        {state === "loading" && (
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-4">
            <div className="h-6 w-6 rounded-full border-4 border-[#C8102E]/20 border-t-[#C8102E] animate-spin shrink-0" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Running scenario simulation…</p>
          </div>
        )}

        {state === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            Simulation failed. Check your API key and try again.
          </div>
        )}

        {state === "done" && result && (
          <div className="rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
            <div className="bg-gray-50 dark:bg-white/5 px-4 py-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Simulation Results</p>
              <span className="text-xs text-gray-400 dark:text-gray-500">{result.confidenceScore}% confidence</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 dark:divide-white/5">
              {[
                { label: "Lead Impact",        val: result.estimatedLeadImpactPct,        suffix: "%" },
                { label: "Application Rate",   val: result.estimatedApplicationImpactPct, suffix: "%" },
                { label: "Lease Conversion",   val: result.estimatedLeaseImpactPct,       suffix: "%" },
                { label: "Occupancy Impact",   val: result.estimatedOccupancyImpactPct,   suffix: "%" },
              ].map(m => {
                const { arrow, cls } = impactArrow(m.val);
                return (
                  <div key={m.label} className="px-4 py-4 text-center">
                    <p className={`text-xl font-bold ${cls}`}>{arrow} {Math.abs(m.val).toFixed(1)}{m.suffix}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{m.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-100 dark:border-white/5 px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{result.reasoning}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campaign Detail ──────────────────────────────────────────────────────────

function CampaignDetail({ campaign, onBack, onApprove }: {
  campaign: Campaign;
  onBack: () => void;
  onApprove: (campaignId: string, variationIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(campaign.variations.filter(v => v.approved).map(v => v.id))
  );
  const [approved, setApproved] = useState(campaign.status !== "pending_approval");
  const [tab, setTab] = useState<"variations" | "intelligence">("variations");

  function toggleVariation(id: string) {
    if (approved) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleApprove() {
    onApprove(campaign.id, Array.from(selected));
    setApproved(true);
  }

  return (
    <div>
      <button onClick={onBack} className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-200">
        ← Back to campaigns
      </button>

      {/* Header */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{campaign.property}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[campaign.status]}`}>
                {STATUS_LABELS[campaign.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{campaign.messaging_angle}</p>
          </div>
          <div className="flex items-center gap-2">
            {campaign.recommended_channels.map(ch => <ChannelBadge key={ch} channel={ch} />)}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4 dark:border-white/5">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{campaign.created_at}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Leads Generated</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{campaign.leads_generated}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Special Offer</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{campaign.current_special ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-gray-100 dark:border-white/5">
        {([
          { key: "variations",   label: "Ad Variations" },
          { key: "intelligence", label: "✦ Intelligence" },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-[#C8102E] text-[#C8102E]"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Ad Variations tab */}
      {tab === "variations" && (
        <>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Ad Variations</h3>
            {!approved && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Select the variations you want to approve</p>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {campaign.variations.map(v => {
              const isSelected = selected.has(v.id);
              return (
                <div
                  key={v.id}
                  onClick={() => toggleVariation(v.id)}
                  className={`rounded-xl border p-5 transition-colors ${
                    approved
                      ? v.approved
                        ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/10"
                        : "border-gray-100 bg-white dark:border-white/5 dark:bg-[#1C1F2E]"
                      : isSelected
                        ? "border-[#C8102E]/40 bg-[#C8102E]/5 cursor-pointer dark:border-[#C8102E]/30 dark:bg-[#C8102E]/10"
                        : "border-gray-100 bg-white cursor-pointer hover:border-gray-300 dark:border-white/5 dark:bg-[#1C1F2E] dark:hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <ChannelBadge channel={v.channel} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Variation {v.variation_num}</span>
                    </div>
                    {approved ? (
                      v.approved && <span className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Approved</span>
                    ) : (
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                        isSelected ? "border-[#C8102E] bg-[#C8102E]" : "border-gray-300 dark:border-white/20"
                      }`}>
                        {isSelected && <span className="text-[10px] text-white font-bold">✓</span>}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 font-bold text-gray-900 dark:text-gray-100">{v.headline}</p>
                  <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{v.primary_text}</p>
                  <div className="mt-3 inline-flex rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                    {v.cta} →
                  </div>
                </div>
              );
            })}
          </div>

          {!approved && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/40 dark:bg-amber-900/10">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selected.size} variation{selected.size !== 1 ? "s" : ""} selected</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Nothing goes live until you approve</p>
              </div>
              <button
                onClick={handleApprove}
                disabled={selected.size === 0}
                className="rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40"
              >
                Approve & Launch →
              </button>
            </div>
          )}

          {approved && (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 dark:border-green-900/40 dark:bg-green-900/10">
              <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Campaign approved. Variations are live.</p>
            </div>
          )}
        </>
      )}

      {/* Intelligence tab */}
      {tab === "intelligence" && (
        <div className="space-y-4">
          <OfferLabPanel campaign={campaign} />
          <CampaignOptimizePanel campaign={campaign} />
          <WhatIfPanel campaign={campaign} />
        </div>
      )}
    </div>
  );
}

// ─── New Campaign Modal ───────────────────────────────────────────────────────

function NewCampaignModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"form" | "generating" | "done">("form");
  const [form, setForm] = useState({
    property: "",
    special: "",
    renterType: "",
    pricingSummary: "",
    occupancyGoal: "",
    urgency: "normal",
  });

  function handleGenerate() {
    if (!form.property) return;
    setStep("generating");
    setTimeout(() => setStep("done"), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1C1F2E]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/5">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">New Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        {step === "form" && (
          <div className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Property *</label>
              <select
                value={form.property}
                onChange={e => setForm(f => ({ ...f, property: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              >
                <option value="">Select a property…</option>
                {["The Monroe", "Parkview Commons", "Creekside at Summerlin", "Sonoran Ridge", "Desert Bloom"].map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Current Special / Offer</label>
              <input
                value={form.special}
                onChange={e => setForm(f => ({ ...f, special: e.target.value }))}
                placeholder="e.g. 1 month free on 12-month leases"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Target Renter</label>
              <input
                value={form.renterType}
                onChange={e => setForm(f => ({ ...f, renterType: e.target.value }))}
                placeholder="e.g. young professionals, families, remote workers"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Pricing Summary</label>
              <input
                value={form.pricingSummary}
                onChange={e => setForm(f => ({ ...f, pricingSummary: e.target.value }))}
                placeholder="e.g. 1BR from $1,450/mo, 2BR from $1,800/mo"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Occupancy Goal</label>
                <input
                  value={form.occupancyGoal}
                  onChange={e => setForm(f => ({ ...f, occupancyGoal: e.target.value }))}
                  placeholder="e.g. 95%"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Urgency</label>
                <select
                  value={form.urgency}
                  onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 dark:border-white/10 dark:text-gray-400">Cancel</button>
              <button
                onClick={handleGenerate}
                disabled={!form.property}
                className="rounded-lg bg-[#C8102E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40"
              >
                Generate with AI →
              </button>
            </div>
          </div>
        )}

        {step === "generating" && (
          <div className="flex flex-col items-center gap-4 px-6 py-14">
            <div className="h-10 w-10 rounded-full border-4 border-[#C8102E]/20 border-t-[#C8102E] animate-spin" />
            <p className="font-semibold text-gray-900 dark:text-gray-100">Generating campaign…</p>
            <p className="text-sm text-gray-500">AI is building your strategy and ad variations</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl dark:bg-green-900/30 dark:text-green-400">✓</div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Campaign created!</p>
            <p className="text-sm text-gray-500">4 ad variations are ready for your review. Nothing goes live until you approve.</p>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg bg-[#C8102E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25]"
            >
              Review Variations →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<CampaignStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCampaigns() {
      setLoading(true);
      try {
        const email = await getOperatorEmail();
        if (!email) return;
        const setupRes = await fetch(`/api/setup?email=${encodeURIComponent(email)}`);
        const setupJson = await setupRes.json();
        const operatorId = setupJson.operator?.id;
        if (!operatorId) return;
        const res = await fetch(`/api/campaigns?operator_id=${operatorId}`);
        const json = await res.json();
        const raw = json.campaigns ?? [];
        // Normalize DB shape to Campaign interface
        const normalized: Campaign[] = raw.map((c: Record<string, unknown>) => ({
          id:                    c.id as string,
          property:              ((c.properties as Record<string, unknown>)?.name as string) ?? "Property",
          property_id:           c.property_id as string,
          operator_id:           c.operator_id as string,
          status:                (c.status as CampaignStatus) ?? "pending_approval",
          messaging_angle:       (c.messaging_angle as string) ?? "",
          recommended_channels:  (c.recommended_channels as AdChannel[]) ?? [],
          urgency:               (c.urgency as string) ?? "normal",
          current_special:       (c.current_special as string | null) ?? null,
          created_at:            new Date(c.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          leads_generated:       (c.leads_generated as number) ?? 0,
          variations:            ((c.ad_variations as Record<string, unknown>[]) ?? []).map((v) => ({
            id:            v.id as string,
            variation_num: v.variation_num as number,
            headline:      v.headline as string,
            primary_text:  v.primary_text as string,
            cta:           v.cta as string,
            channel:       v.channel as AdChannel,
            approved:      (v.status as string) === "approved",
          })),
        }));
        setCampaigns(normalized);
      } finally {
        setLoading(false);
      }
    }
    loadCampaigns();
  }, []);

  const selected = campaigns.find(c => c.id === selectedId) ?? null;

  function handleApprove(campaignId: string, variationIds: string[]) {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== campaignId) return c;
      return {
        ...c,
        status: "approved" as CampaignStatus,
        variations: c.variations.map(v => ({ ...v, approved: variationIds.includes(v.id) })),
      };
    }));
  }

  const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads_generated, 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const pendingApproval = campaigns.filter(c => c.status === "pending_approval").length;

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {selected ? (
          <CampaignDetail
            campaign={selected}
            onBack={() => setSelectedId(null)}
            onApprove={handleApprove}
          />
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Marketing</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI-generated ad campaigns · you approve before anything goes live</p>
              </div>
              <button
                onClick={() => setShowNew(true)}
                className="rounded-lg bg-[#C8102E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] transition-colors"
              >
                + New Campaign
              </button>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4">
              {[
                { label: "Total Leads Generated", value: totalLeads,      note: "across all campaigns" },
                { label: "Active Campaigns",       value: activeCampaigns, note: "currently running"    },
                { label: "Pending Your Approval",  value: pendingApproval, note: "review required"      },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{s.note}</p>
                </div>
              ))}
            </div>

            {pendingApproval > 0 && (
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/10">
                <span className="text-amber-500 text-lg">⚠</span>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">{pendingApproval} campaign{pendingApproval > 1 ? "s" : ""} waiting for your approval.</span>{" "}
                  Nothing goes live until you review and approve the ad variations.
                </p>
              </div>
            )}

            <div className="mb-4 flex gap-2 flex-wrap">
              {(["all", "pending_approval", "active", "approved", "paused"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    filter === f
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                  }`}
                >
                  {f === "all" ? "All" : STATUS_LABELS[f]}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {loading && (
                <div className="rounded-xl border border-gray-100 bg-white p-10 text-center dark:border-white/5 dark:bg-[#1C1F2E]">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C8102E]" />
                  <p className="text-sm text-gray-400">Loading campaigns…</p>
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="rounded-xl border border-gray-100 bg-white p-10 text-center dark:border-white/5 dark:bg-[#1C1F2E]">
                  <p className="text-gray-400 dark:text-gray-500">No campaigns yet. Click <strong>+ New Campaign</strong> to generate one with AI.</p>
                </div>
              )}
              {filtered.map(campaign => (
                <div
                  key={campaign.id}
                  onClick={() => setSelectedId(campaign.id)}
                  className="cursor-pointer rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-white/5 dark:bg-[#1C1F2E]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{campaign.property}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[campaign.status]}`}>
                          {STATUS_LABELS[campaign.status]}
                        </span>
                        {campaign.urgency === "high" && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            High urgency
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{campaign.messaging_angle}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden sm:block text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{campaign.leads_generated}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">leads</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {campaign.recommended_channels.map(ch => <ChannelBadge key={ch} channel={ch} />)}
                      </div>
                      <span className="text-gray-300 dark:text-gray-600">›</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-white/5 pt-3">
                    <span>{campaign.variations.length} variations</span>
                    {campaign.current_special && <span>· {campaign.current_special}</span>}
                    <span>· Created {campaign.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
