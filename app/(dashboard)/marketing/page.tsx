"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  imageUrl?: string;
}

interface BudgetForecast {
  impressions: number;
  clicks: number;
  leads: number;
  conversions_with_lub: number;
  conversions_without_lub: number;
  cost_per_lead: number;
  cost_per_move_in: number;
  occupancy_impact_pct: number;
  new_occupancy_pct: number;
  days_to_90pct: number | null;
  reach_90pct_date: string | null;
  summary: string;
}

interface OfferLabResult {
  scores: { offerStrength: number; marketCompetitiveness: number; leadAttraction: number; conversionPotential: number; overall: number; explanation: string };
  recommendation: { improvedSpecial: string; improvedMessagingAngle: string; suggestedPositioning: string; reasoning: string };
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

const CHANNEL_COLORS: Record<AdChannel, string> = { facebook: "bg-blue-600", google: "bg-red-500", instagram: "bg-pink-600" };
const CHANNEL_ICONS: Record<AdChannel, string>  = { facebook: "f", google: "G", instagram: "in" };

function scoreColor(n: number) { return n >= 70 ? "bg-green-500" : n >= 40 ? "bg-amber-400" : "bg-red-400"; }
function scoreText(n: number)  { return n >= 70 ? "text-green-600 dark:text-green-400" : n >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"; }
function impactArrow(n: number) { return n > 0 ? { arrow: "↑", cls: "text-green-600 dark:text-green-400" } : n < 0 ? { arrow: "↓", cls: "text-red-500 dark:text-red-400" } : { arrow: "→", cls: "text-gray-400" }; }

function fmt(n: number) { return n.toLocaleString(); }

// ─── Channel Badge ────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: AdChannel }) {
  return (
    <span className={`inline-flex items-center justify-center h-5 w-7 rounded text-[10px] font-bold text-white ${CHANNEL_COLORS[channel]}`}>
      {CHANNEL_ICONS[channel]}
    </span>
  );
}

// ─── Ad Preview Components ────────────────────────────────────────────────────

function PropertyImagePlaceholder({ propertyName }: { propertyName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
      <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
      </svg>
      <p className="text-[10px] text-gray-400 text-center px-2">{propertyName}</p>
    </div>
  );
}

function FacebookAdPreview({ variation, propertyName, imageUrl }: { variation: AdVariation; propertyName: string; imageUrl?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm text-left">
      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white">
        <div className="h-9 w-9 shrink-0 rounded-full bg-[#C8102E] flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">LUB</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900 leading-none">{propertyName}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="text-[9px] text-gray-500">Sponsored</p>
            <span className="text-[9px] text-gray-300">·</span>
            <svg className="h-2.5 w-2.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      <p className="px-3 pb-2 text-[11px] text-gray-800 leading-relaxed line-clamp-2">{variation.primary_text}</p>
      <div className="relative h-36 overflow-hidden">
        {imageUrl
          ? <img src={imageUrl} alt="Property" className="w-full h-full object-cover" />
          : <PropertyImagePlaceholder propertyName={propertyName} />
        }
        <div className={`absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[9px] font-bold text-white ${CHANNEL_COLORS[variation.channel]}`}>
          Facebook
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-3 py-2">
        <div className="min-w-0 flex-1 mr-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide truncate">{propertyName.toLowerCase()}</p>
          <p className="text-xs font-bold text-gray-900 line-clamp-1">{variation.headline}</p>
        </div>
        <button className="shrink-0 rounded bg-[#1877F2] px-2.5 py-1 text-[10px] font-bold text-white whitespace-nowrap">
          {variation.cta}
        </button>
      </div>
    </div>
  );
}

function InstagramAdPreview({ variation, propertyName, imageUrl }: { variation: AdVariation; propertyName: string; imageUrl?: string }) {
  const handle = propertyName.toLowerCase().replace(/\s+/g, "_");
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm text-left">
      <div className="flex items-center justify-between px-3 py-2 bg-white">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="h-full w-full rounded-full bg-[#C8102E] flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">LUB</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-900 leading-none">{handle}</p>
            <p className="text-[9px] text-gray-400">Sponsored</p>
          </div>
        </div>
        <span className="text-gray-400 text-sm leading-none">•••</span>
      </div>
      <div className="relative aspect-square overflow-hidden">
        {imageUrl
          ? <img src={imageUrl} alt="Property" className="w-full h-full object-cover" />
          : <PropertyImagePlaceholder propertyName={propertyName} />
        }
      </div>
      <div className="px-3 pt-2 pb-1 flex items-center gap-3">
        <svg className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <svg className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div className="px-3 pb-3">
        <p className="text-[11px] text-gray-800 leading-relaxed line-clamp-2">
          <span className="font-semibold">{handle} </span>{variation.primary_text}
        </p>
        <button className="mt-2 w-full rounded-lg bg-[#C8102E] py-1.5 text-[10px] font-bold text-white">
          {variation.cta} →
        </button>
      </div>
    </div>
  );
}

function GoogleAdPreview({ variation, propertyName }: { variation: AdVariation; propertyName: string }) {
  const slug = propertyName.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-left">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-400 flex items-center justify-center">
          <span className="text-white text-[6px] font-bold">G</span>
        </div>
        <span className="text-[10px] text-gray-500">Google</span>
        <span className="rounded border border-green-600 px-1 text-[8px] font-semibold text-green-700 ml-1">Sponsored</span>
      </div>
      <p className="text-[10px] text-gray-500 mb-1">apartment-rentals.com/{slug}</p>
      <p className="text-sm font-semibold text-[#1a0dab] hover:underline cursor-pointer line-clamp-1">{variation.headline}</p>
      <p className="text-[11px] text-gray-600 mt-1 leading-relaxed line-clamp-3">{variation.primary_text}</p>
      <div className="mt-2 flex gap-3 flex-wrap">
        <span className="text-[10px] text-[#1a0dab] hover:underline cursor-pointer">{variation.cta}</span>
        <span className="text-[10px] text-[#1a0dab] hover:underline cursor-pointer">Floor Plans</span>
        <span className="text-[10px] text-[#1a0dab] hover:underline cursor-pointer">Schedule Tour</span>
      </div>
    </div>
  );
}

function AdPreviewCard({ variation, propertyName, imageUrl }: { variation: AdVariation; propertyName: string; imageUrl?: string }) {
  if (variation.channel === "instagram") return <InstagramAdPreview variation={variation} propertyName={propertyName} imageUrl={imageUrl} />;
  if (variation.channel === "google")    return <GoogleAdPreview variation={variation} propertyName={propertyName} />;
  return <FacebookAdPreview variation={variation} propertyName={propertyName} imageUrl={imageUrl} />;
}

// ─── Budget Forecast Panel ────────────────────────────────────────────────────

function BudgetForecastPanel({
  campaignId,
  propertyName,
  channel,
  currentOccupancyPct,
  vacantUnits,
  totalUnits,
  city,
  state,
  budget,
  durationDays,
}: {
  campaignId: string;
  propertyName: string;
  channel: AdChannel;
  currentOccupancyPct: number;
  vacantUnits: number;
  totalUnits: number;
  city: string;
  state: string;
  budget: number;
  durationDays: number;
}) {
  const [forecast, setForecast] = useState<BudgetForecast | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const prevKey = useRef("");

  useEffect(() => {
    if (!budget || !durationDays || !totalUnits) return;
    const key = `${campaignId}-${budget}-${durationDays}-${channel}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    setLoading(true);
    setError(null);
    fetch("/api/campaigns/budget-forecast", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budget,
        duration_days:         durationDays,
        channel,
        current_occupancy_pct: currentOccupancyPct,
        vacant_units:          vacantUnits,
        total_units:           totalUnits,
        city,
        state,
        property_name:         propertyName,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) setForecast(d.forecast);
        else setError("Forecast failed. Try again.");
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [budget, durationDays, channel, campaignId, currentOccupancyPct, vacantUnits, totalUnits, city, state, propertyName]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-5">
        <div className="h-5 w-5 rounded-full border-2 border-[#C8102E]/20 border-t-[#C8102E] animate-spin shrink-0" />
        <p className="text-sm text-gray-500 dark:text-gray-400">AI is calculating your forecast…</p>
      </div>
    );
  }
  if (error) return <p className="text-xs text-red-500 px-1">{error}</p>;
  if (!forecast) return null;

  return (
    <div className="rounded-xl border border-[#C8102E]/20 bg-[#C8102E]/5 dark:bg-[#C8102E]/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#C8102E]/10">
        <div className="h-5 w-5 rounded-full bg-[#C8102E] flex items-center justify-center">
          <span className="text-white text-[9px] font-bold">AI</span>
        </div>
        <p className="text-xs font-semibold text-[#C8102E]">LUB Forecast — ${budget} over {durationDays} days</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#C8102E]/10">
        {[
          { label: "People Reached",    value: fmt(forecast.impressions),             sub: "impressions"          },
          { label: "Leads Generated",   value: fmt(forecast.leads),                   sub: "inquiries"            },
          { label: "Move-ins with LUB", value: fmt(forecast.conversions_with_lub),    sub: `vs ${fmt(forecast.conversions_without_lub)} without` },
          { label: "Cost per Move-in",  value: `$${forecast.cost_per_move_in.toFixed(0)}`, sub: `$${forecast.cost_per_lead.toFixed(0)}/lead` },
        ].map(m => (
          <div key={m.label} className="px-4 py-3 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{m.value}</p>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{m.label}</p>
            <p className="text-[9px] text-gray-400">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Occupancy impact */}
      <div className="border-t border-[#C8102E]/10 px-4 py-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#C8102E]">+{forecast.occupancy_impact_pct.toFixed(1)}%</span>
          <div>
            <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">Occupancy gain</p>
            <p className="text-[10px] text-gray-400">{forecast.new_occupancy_pct.toFixed(1)}% after campaign</p>
          </div>
        </div>
        {forecast.reach_90pct_date && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-1.5">
            <svg className="h-3.5 w-3.5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-[10px] font-bold text-green-700 dark:text-green-400">Reach 90% by</p>
              <p className="text-xs font-bold text-green-800 dark:text-green-300">
                {new Date(forecast.reach_90pct_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="border-t border-[#C8102E]/10 px-4 py-3">
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{forecast.summary}</p>
      </div>
    </div>
  );
}

// ─── Launch Modal ─────────────────────────────────────────────────────────────

function LaunchModal({
  campaign,
  imageUrl,
  onClose,
  onLaunched,
}: {
  campaign: Campaign;
  imageUrl?: string;
  onClose: () => void;
  onLaunched: (campaignId: string) => void;
}) {
  const [step, setStep] = useState<"setup" | "payment">("setup");
  const [budget, setBudget]           = useState(50);
  const [durationDays, setDurationDays] = useState(14);
  const [channel, setChannel]         = useState<AdChannel>(campaign.recommended_channels[0] ?? "facebook");
  const [property, setProperty]       = useState<{ city: string; state: string; total_units: number; occupied_units: number } | null>(null);
  const [cardName, setCardName]       = useState("");
  const [cardNumber, setCardNumber]   = useState("");
  const [cardExpiry, setCardExpiry]   = useState("");
  const [cardCvc, setCardCvc]         = useState("");
  const [launching, setLaunching]     = useState(false);
  const [launched, setLaunched]       = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${campaign.property_id}/details`)
      .then(r => r.json())
      .then(d => {
        const p = d.property ?? d;
        setProperty({ city: p.city, state: p.state, total_units: p.total_units ?? 0, occupied_units: p.occupied_units ?? 0 });
      })
      .catch(() => {});
  }, [campaign.property_id]);

  const vacantUnits   = property ? (property.total_units - property.occupied_units) : 0;
  const currentOccPct = property && property.total_units > 0 ? Math.round((property.occupied_units / property.total_units) * 100) : 0;

  const DURATION_OPTIONS = [7, 14, 30, 60];

  async function handleLaunch() {
    if (!cardName || !cardNumber || !cardExpiry || !cardCvc) return;
    setLaunching(true);
    await new Promise(r => setTimeout(r, 1800));
    setLaunching(false);
    setLaunched(true);
    setTimeout(() => { onLaunched(campaign.id); onClose(); }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1C1F2E] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/5">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Launch Campaign</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{campaign.property}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        {launched ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl dark:bg-green-900/30 dark:text-green-400">✓</div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Campaign Launched!</p>
            <p className="text-sm text-gray-500">Your ad is now live on {channel}. LUB will qualify every lead automatically.</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Step 1: Setup */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">1. Campaign Setup</p>

              {/* Channel */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Ad Platform</label>
                <div className="flex gap-2">
                  {(["facebook", "instagram", "google"] as AdChannel[]).map(ch => (
                    <button
                      key={ch}
                      onClick={() => setChannel(ch)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        channel === ch
                          ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E] dark:bg-[#C8102E]/10"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-white/10 dark:text-gray-400"
                      }`}
                    >
                      <span className={`h-4 w-6 rounded text-[9px] font-bold text-white flex items-center justify-center ${CHANNEL_COLORS[ch]}`}>
                        {CHANNEL_ICONS[ch]}
                      </span>
                      {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Total Budget</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">$</span>
                  <input
                    type="number"
                    min={1}
                    value={budget}
                    onChange={e => setBudget(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-4 py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  {[5, 25, 50, 100, 250, 500].map(v => (
                    <button
                      key={v}
                      onClick={() => setBudget(v)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                        budget === v
                          ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                          : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-white/10"
                      }`}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Campaign Duration</label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => setDurationDays(d)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        durationDays === d
                          ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-white/10 dark:text-gray-400"
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">≈ ${(budget / durationDays).toFixed(2)}/day</p>
              </div>

            </div>

            {/* AI Impact Forecast */}
            <div className="border-t border-gray-100 dark:border-white/5 pt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">2. AI Impact Forecast</p>
              {!property ? (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-4">
                  <div className="h-4 w-4 rounded-full border-2 border-[#C8102E]/20 border-t-[#C8102E] animate-spin shrink-0" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading property data…</p>
                </div>
              ) : (
                <BudgetForecastPanel
                  campaignId={campaign.id}
                  propertyName={campaign.property}
                  channel={channel}
                  currentOccupancyPct={currentOccPct}
                  vacantUnits={vacantUnits}
                  totalUnits={property.total_units}
                  city={property.city}
                  state={property.state}
                  budget={budget}
                  durationDays={durationDays}
                />
              )}
            </div>

            {/* Step 3: Payment */}
            <div className="border-t border-gray-100 dark:border-white/5 pt-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">3. Payment</p>
                <div className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[10px] text-gray-400">Secured by Stripe</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Name on Card</label>
                  <input
                    type="text"
                    placeholder="Marcus Thompson"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Card Number</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-mono dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Expiry</label>
                    <input
                      type="text"
                      placeholder="MM / YY"
                      value={cardExpiry}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, "");
                        setCardExpiry(v.length > 2 ? `${v.slice(0,2)} / ${v.slice(2,4)}` : v);
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-mono dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">CVC</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardCvc}
                      onChange={e => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-mono dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Order summary */}
              <div className="mt-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4">
                <div className="space-y-2">
                  {[
                    { label: `${channel.charAt(0).toUpperCase() + channel.slice(1)} Ads (${durationDays} days)`, value: `$${budget.toFixed(2)}` },
                    { label: "LUB AI Qualification",   value: "Included" },
                    { label: "Platform Fee",            value: "$0.00"    },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{r.label}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{r.value}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 dark:border-white/10 pt-2 flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-gray-100">Total</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">${budget.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLaunch}
                disabled={launching || !cardName || !cardNumber || !cardExpiry || !cardCvc}
                className="mt-4 w-full rounded-xl bg-[#C8102E] py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ boxShadow: "0 4px 16px rgba(200,16,46,0.25)" }}
              >
                {launching ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Launching…
                  </span>
                ) : `Launch for $${budget.toFixed(2)} →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

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

// ─── Intelligence Panels (unchanged from before) ──────────────────────────────

interface OfferScoreData {
  your_offer: {
    label: string; score: number; grade: string; rationale: string;
    strengths: string[]; weaknesses?: string[];
    metrics: { expected_inquiries_90d: number; expected_leases_90d: number; cost_per_lease: number; occupancy_gain_90d: number; monthly_revenue_impact: number };
  };
  recommended_offer: {
    label: string; description?: string; score: number; grade: string; rationale: string;
    strengths: string[]; why_better_than_yours?: string;
    metrics: { expected_inquiries_90d: number; expected_leases_90d: number; cost_per_lease: number; occupancy_gain_90d: number; monthly_revenue_impact: number };
  };
  market_context: string;
  budget_verdict: string;
  recommended_channels: string[];
}

function offerGradeColor(grade: string) {
  if (grade.startsWith("A")) return { text: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20", ring: "ring-green-300 dark:ring-green-700" };
  if (grade.startsWith("B")) return { text: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20",   ring: "ring-blue-300 dark:ring-blue-700"  };
  if (grade.startsWith("C")) return { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", ring: "ring-amber-300 dark:ring-amber-700" };
  return                            { text: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-900/20",     ring: "ring-red-300 dark:ring-red-700"    };
}

function OfferMetricRow({ label, yours, rec, format }: { label: string; yours: number; rec: number; format: (n: number) => string }) {
  const maxV = Math.max(yours, rec, 1);
  const yoursWins = yours >= rec;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-right text-xs font-bold text-blue-500">{format(yours)}</span>
        <div className="flex-1 space-y-1">
          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round((yours/maxV)*100)}%` }} />
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
            <div className="h-full rounded-full bg-[#C8102E]" style={{ width: `${Math.round((rec/maxV)*100)}%` }} />
          </div>
        </div>
        <span className="w-16 shrink-0 text-xs font-bold text-[#C8102E]">{format(rec)}</span>
      </div>
    </div>
  );
}

function OfferLabPanel({ campaign, onLaunch }: { campaign: Campaign; onLaunch?: () => void }) {
  const [offerText, setOfferText]   = useState(campaign.current_special ?? "");
  const [budget, setBudget]         = useState(1000);
  const [result, setResult]         = useState<OfferScoreData | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [property, setProperty]     = useState<{ city: string; state: string; total_units: number; occupied_units: number } | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<"yours" | "recommended" | null>(null);

  useEffect(() => {
    fetch(`/api/properties/${campaign.property_id}/details`)
      .then(r => r.json())
      .then(d => { const p = d.property ?? d; setProperty({ city: p.city, state: p.state, total_units: p.total_units ?? 0, occupied_units: p.occupied_units ?? 0 }); })
      .catch(() => {});
  }, [campaign.property_id]);

  async function score() {
    if (!offerText.trim() || !property) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedOffer(null);
    try {
      const res = await fetch("/api/properties/offer-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_name:         campaign.property,
          city:                  property.city,
          state:                 property.state,
          current_occupancy_pct: property.total_units > 0 ? Math.round((property.occupied_units / property.total_units) * 100) : 0,
          total_units:           property.total_units,
          occupied_units:        property.occupied_units,
          unit_types:            [],
          avg_rents:             {},
          your_offer:            offerText.trim(),
          monthly_budget:        budget,
        }),
      });
      const json = await res.json();
      if (json.ok) setResult(json);
      else setError(json.error ?? "Scoring failed");
    } catch { setError("Network error. Try again."); }
    finally { setLoading(false); }
  }

  const fmt = { num: (n: number) => n.toLocaleString(), usd: (n: number) => `$${n.toLocaleString()}`, pct: (n: number) => `+${n}%` };

  return (
    <div className="rounded-xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1C1F2E]">
      {/* Header */}
      <div className="border-b border-gray-100 dark:border-white/5 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Offer Lab</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enter any offer idea — AI grades it against the market, suggests what would convert better, and shows the performance difference</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#C8102E]/10 px-2.5 py-1 text-[10px] font-bold text-[#C8102E]">AI-Powered</span>
        </div>

        {/* Input row */}
        <textarea
          value={offerText}
          onChange={e => setOfferText(e.target.value)}
          rows={2}
          placeholder='e.g. "1 month free on a 12-month lease" or "No security deposit + $300 gift card"'
          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E] resize-none mb-3"
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 px-3 py-2 text-xs">
            <span className="text-gray-400">Monthly ad budget:</span>
            <span className="font-semibold text-gray-500">$</span>
            <input type="number" min={100} step={100} value={budget} onChange={e => setBudget(Math.max(100, parseInt(e.target.value) || 100))} className="w-20 bg-transparent font-bold text-gray-800 dark:text-gray-100 focus:outline-none" />
            <span className="text-gray-400">/mo</span>
          </div>
          <button onClick={score} disabled={!offerText.trim() || loading || !property} className="flex items-center gap-2 rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
            {loading ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />Scoring…</> : result ? "Re-score →" : "Score My Offer"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-500 dark:text-red-400">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="divide-y divide-gray-100 dark:divide-white/5">

          {/* Market context */}
          <div className="px-5 py-4 bg-blue-50/50 dark:bg-blue-900/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">Market Context — {property?.city}, {property?.state}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{result.market_context}</p>
          </div>

          {/* Head-to-head cards — click to select */}
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Choose which offer to run — tap a card to select it</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Your offer */}
              {(() => {
                const o = result.your_offer;
                const gc = offerGradeColor(o.grade);
                const selected = selectedOffer === "yours";
                return (
                  <button
                    type="button"
                    onClick={() => setSelectedOffer(selected ? null : "yours")}
                    className={`text-left rounded-2xl border p-4 shadow-sm transition-all cursor-pointer w-full relative flex flex-col justify-start ${
                      selected
                        ? "ring-[3px] ring-blue-500 border-blue-300 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-900/20"
                        : `ring-1 ${gc.ring} border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] hover:ring-2 hover:ring-blue-300`
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-black">✓</span>
                    )}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div><p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Your Offer</p><p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug">{o.label}</p></div>
                      <div className={`shrink-0 flex flex-col items-center rounded-xl px-2.5 py-1.5 ${gc.bg}`}>
                        <span className={`text-2xl font-black leading-none ${gc.text}`}>{o.grade}</span>
                        <span className="text-[9px] text-gray-400">{o.score}/10</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{o.rationale}</p>
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {[
                        { v: o.metrics.expected_leases_90d, l: "leases/90d" },
                        { v: `$${o.metrics.cost_per_lease.toLocaleString()}`, l: "cost/lease" },
                        { v: `+${o.metrics.occupancy_gain_90d}%`, l: "occ. gain" },
                        { v: o.metrics.expected_inquiries_90d, l: "inquiries" },
                      ].map(({ v, l }) => (
                        <div key={l} className="rounded-lg bg-gray-50 dark:bg-white/5 p-2 text-center">
                          <p className="text-sm font-black text-gray-700 dark:text-gray-200">{v}</p>
                          <p className="text-[9px] text-gray-400">{l}</p>
                        </div>
                      ))}
                    </div>
                    {o.weaknesses?.map((w, i) => <p key={i} className="flex items-start gap-1 text-[11px] text-gray-500"><span className="text-red-400 shrink-0">✕</span>{w}</p>)}
                  </button>
                );
              })()}

              {/* Recommended offer */}
              {(() => {
                const o = result.recommended_offer;
                const gc = offerGradeColor(o.grade);
                const selected = selectedOffer === "recommended";
                return (
                  <button
                    type="button"
                    onClick={() => setSelectedOffer(selected ? null : "recommended")}
                    className={`text-left rounded-2xl border p-4 shadow-sm transition-all cursor-pointer w-full relative overflow-hidden flex flex-col justify-start ${
                      selected
                        ? "ring-[3px] ring-[#C8102E] border-[#C8102E]/40 bg-[#C8102E]/5 dark:bg-[#C8102E]/10"
                        : `ring-1 ${gc.ring} border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] hover:ring-2 hover:ring-[#C8102E]/50`
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#C8102E] text-white text-[10px] font-black">✓</span>
                    )}
                    {!selected && <div className="absolute top-3 right-3 rounded-full bg-[#C8102E] px-2 py-0.5 text-[8px] font-bold text-white">AI PICK</div>}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#C8102E] mb-1">LUB Recommends</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug">{o.label}</p>
                        {o.description && <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{o.description}</p>}
                      </div>
                      <div className={`shrink-0 flex flex-col items-center rounded-xl px-2.5 py-1.5 ${gc.bg}`}>
                        <span className={`text-2xl font-black leading-none ${gc.text}`}>{o.grade}</span>
                        <span className="text-[9px] text-gray-400">{o.score}/10</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{o.rationale}</p>
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {[
                        { v: o.metrics.expected_leases_90d, l: "leases/90d" },
                        { v: `$${o.metrics.cost_per_lease.toLocaleString()}`, l: "cost/lease" },
                        { v: `+${o.metrics.occupancy_gain_90d}%`, l: "occ. gain" },
                        { v: o.metrics.expected_inquiries_90d, l: "inquiries" },
                      ].map(({ v, l }) => (
                        <div key={l} className="rounded-lg bg-[#C8102E]/8 dark:bg-[#C8102E]/12 p-2 text-center">
                          <p className="text-sm font-black text-[#C8102E]">{v}</p>
                          <p className="text-[9px] text-gray-400">{l}</p>
                        </div>
                      ))}
                    </div>
                    {o.strengths.map((s, i) => <p key={i} className="flex items-start gap-1 text-[11px] text-gray-500"><span className="text-green-500 shrink-0">✓</span>{s}</p>)}
                    {o.why_better_than_yours && (
                      <div className="mt-2 rounded-lg bg-[#C8102E]/8 dark:bg-[#C8102E]/12 px-3 py-2">
                        <p className="text-[11px] font-semibold text-[#C8102E]">Why it wins: {o.why_better_than_yours}</p>
                      </div>
                    )}
                  </button>
                );
              })()}
            </div>

            {/* Confirmation bar */}
            {selectedOffer && (
              <div className={`mt-4 rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
                selectedOffer === "yours"
                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  : "bg-[#C8102E]/5 dark:bg-[#C8102E]/10 border border-[#C8102E]/20"
              }`}>
                <div>
                  <p className={`text-xs font-bold ${selectedOffer === "yours" ? "text-blue-600 dark:text-blue-400" : "text-[#C8102E]"}`}>
                    Running: {selectedOffer === "yours" ? result.your_offer.label : result.recommended_offer.label}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {selectedOffer === "yours"
                      ? `${result.your_offer.metrics.expected_leases_90d} leases · +${result.your_offer.metrics.occupancy_gain_90d}% occupancy in 90 days`
                      : `${result.recommended_offer.metrics.expected_leases_90d} leases · +${result.recommended_offer.metrics.occupancy_gain_90d}% occupancy in 90 days`
                    }
                  </p>
                </div>
                <button
                  onClick={onLaunch}
                  className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors ${
                    selectedOffer === "yours" ? "bg-blue-500 hover:bg-blue-600" : "bg-[#C8102E] hover:bg-[#A50D25]"
                  }`}
                >
                  Use This Offer →
                </button>
              </div>
            )}
          </div>

          {/* Performance comparison bars */}
          <div className="px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Performance Comparison</p>
            <div className="mb-3 flex gap-4 text-[10px] text-gray-400">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded bg-blue-400" />Your offer</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded bg-[#C8102E]" />LUB recommended</span>
            </div>
            <div className="space-y-4">
              <OfferMetricRow label="Leases in 90 days"     yours={result.your_offer.metrics.expected_leases_90d}     rec={result.recommended_offer.metrics.expected_leases_90d}     format={fmt.num} />
              <OfferMetricRow label="Total inquiries"       yours={result.your_offer.metrics.expected_inquiries_90d}   rec={result.recommended_offer.metrics.expected_inquiries_90d}   format={fmt.num} />
              <OfferMetricRow label="Occupancy gain"        yours={result.your_offer.metrics.occupancy_gain_90d}       rec={result.recommended_offer.metrics.occupancy_gain_90d}       format={fmt.pct} />
              <OfferMetricRow label="Monthly revenue impact" yours={result.your_offer.metrics.monthly_revenue_impact}  rec={result.recommended_offer.metrics.monthly_revenue_impact}  format={fmt.usd} />
            </div>
          </div>

          {/* Budget verdict + channels */}
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">Budget Verdict</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{result.budget_verdict}</p>
            </div>
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">Best Channels</p>
              <div className="flex flex-wrap gap-1.5">
                {result.recommended_channels.map((ch, i) => (
                  <span key={i} className="rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">{ch}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignOptimizePanel({ campaign }: { campaign: Campaign }) {
  const [state, setState]       = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult]     = useState<OptimizationResult | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, "pending" | "applying" | "done" | "dismissed">>({});

  async function analyze() {
    setState("loading");
    try {
      const res = await fetch("/api/intelligence/campaign-optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign_id: campaign.id }) });
      const data = await res.json();
      if (data.ok) { setResult({ optimizationScore: data.optimizationScore, summary: data.summary, actions: data.actions }); setState("done"); }
      else setState("error");
    } catch { setState("error"); }
  }

  async function applyAction(actionId: string) {
    setActionStates(s => ({ ...s, [actionId]: "applying" }));
    try {
      await fetch("/api/intelligence/campaign-optimize", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action_id: actionId }) });
      setActionStates(s => ({ ...s, [actionId]: "done" }));
    } catch { setActionStates(s => ({ ...s, [actionId]: "pending" })); }
  }

  function dismissAction(idx: number) {
    if (!result) return;
    setResult({ ...result, actions: result.actions.map((a, i) => i === idx ? { ...a, executionStatus: "dismissed" as const } : a) });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1C1F2E]">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-5 py-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Campaign Optimization</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">AI-generated actions to improve performance</p>
        </div>
        {state !== "loading" && <button onClick={analyze} className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A50D25] transition-colors">{state === "done" ? "Re-analyze →" : "Analyze →"}</button>}
      </div>
      {state === "idle"    && <div className="flex flex-col items-center gap-2 px-5 py-10 text-center"><div className="text-3xl">⚡</div><p className="text-sm font-medium text-gray-700 dark:text-gray-300">Find what to fix first</p><p className="text-xs text-gray-400 dark:text-gray-500">AI analyzes performance and generates prioritized actions</p></div>}
      {state === "loading" && <div className="flex flex-col items-center gap-3 px-5 py-10"><div className="h-8 w-8 rounded-full border-4 border-[#C8102E]/20 border-t-[#C8102E] animate-spin" /><p className="text-sm text-gray-500 dark:text-gray-400">Analyzing campaign performance…</p></div>}
      {state === "error"   && <div className="px-5 py-6 text-center text-sm text-red-500">Analysis failed.</div>}
      {state === "done" && result && (
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-center gap-4 rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${result.optimizationScore >= 70 ? "bg-green-500" : result.optimizationScore >= 40 ? "bg-amber-400" : "bg-red-400"}`}>{result.optimizationScore}</div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.summary}</p>
          </div>
          <div className="space-y-3">
            {result.actions.filter(a => a.executionStatus !== "dismissed").map((action, idx) => {
              const ast = action.id ? (actionStates[action.id] ?? action.executionStatus) : action.executionStatus;
              return (
                <div key={idx} className="rounded-xl border border-gray-100 dark:border-white/5 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{action.title}</p>
                      {action.autoExecutable && <span className="rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-[10px] font-semibold">Auto-executable</span>}
                    </div>
                    <button onClick={() => dismissAction(idx)} className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 text-xs shrink-0">dismiss</button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{action.description}</p>
                  <p className="text-xs text-[#C8102E] dark:text-[#e85c76] mb-3">Expected: {action.expectedImpact}</p>
                  {ast === "done" ? <span className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Applied</span>
                    : ast === "applying" ? <span className="text-xs text-gray-400">Applying…</span>
                    : action.id ? <button onClick={() => applyAction(action.id!)} className="rounded-lg border border-[#C8102E] px-3 py-1.5 text-xs font-semibold text-[#C8102E] hover:bg-[#C8102E] hover:text-white transition-colors">Apply →</button>
                    : null}
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
  const [form, setForm] = useState({ description: "", budgetChangePct: "", offerChange: "", channelSwitch: "" });

  async function runSimulation() {
    if (!form.description) return;
    setState("loading");
    const changes: Record<string, unknown> = {};
    if (form.budgetChangePct) { const pct = parseFloat(form.budgetChangePct); if (pct > 0) changes.budgetIncreasePct = pct; else changes.budgetDecreasePct = Math.abs(pct); }
    if (form.offerChange)   changes.offerChange   = form.offerChange;
    if (form.channelSwitch) changes.channelSwitch = form.channelSwitch;
    try {
      const res = await fetch("/api/intelligence/what-if", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ property_id: campaign.property_id, scenario: { description: form.description, changes } }) });
      const data = await res.json();
      if (data.ok) { setResult(data.result); setState("done"); } else setState("error");
    } catch { setState("error"); }
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
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. What if I doubled my Facebook budget and added a free parking offer?" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Budget Change %", key: "budgetChangePct", placeholder: "+20 or -10" },
            { label: "Offer Change",    key: "offerChange",    placeholder: "e.g. free parking" },
            { label: "Channel Switch",  key: "channelSwitch",  placeholder: "e.g. Google Ads" },
          ].map(f => (
            <div key={f.key}>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">{f.label}</label>
              <input value={(form as Record<string, string>)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button onClick={runSimulation} disabled={!form.description || state === "loading"} className="rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
            {state === "loading" ? "Simulating…" : "Run Simulation →"}
          </button>
        </div>
        {state === "loading" && <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-4"><div className="h-6 w-6 rounded-full border-4 border-[#C8102E]/20 border-t-[#C8102E] animate-spin shrink-0" /><p className="text-sm text-gray-500 dark:text-gray-400">Running scenario simulation…</p></div>}
        {state === "error"   && <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">Simulation failed.</div>}
        {state === "done" && result && (
          <div className="rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
            <div className="bg-gray-50 dark:bg-white/5 px-4 py-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Simulation Results</p>
              <span className="text-xs text-gray-400">{result.confidenceScore}% confidence</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 dark:divide-white/5">
              {[
                { label: "Lead Impact",      val: result.estimatedLeadImpactPct },
                { label: "Application Rate", val: result.estimatedApplicationImpactPct },
                { label: "Lease Conversion", val: result.estimatedLeaseImpactPct },
                { label: "Occupancy Impact", val: result.estimatedOccupancyImpactPct },
              ].map(m => {
                const { arrow, cls } = impactArrow(m.val);
                return (
                  <div key={m.label} className="px-4 py-4 text-center">
                    <p className={`text-xl font-bold ${cls}`}>{arrow} {Math.abs(m.val).toFixed(1)}%</p>
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

function CampaignDetail({
  campaign,
  imageUrl,
  onBack,
  onApprove,
  onLaunched,
  onImageChange,
}: {
  campaign: Campaign;
  imageUrl?: string;
  onBack: () => void;
  onApprove: (campaignId: string, variationIds: string[]) => void;
  onLaunched: (campaignId: string) => void;
  onImageChange: (campaignId: string, url: string) => void;
}) {
  const [selected, setSelected]     = useState<Set<string>>(new Set(campaign.variations.filter(v => v.approved).map(v => v.id)));
  const [approved, setApproved]     = useState(campaign.status !== "pending_approval");
  const [tab, setTab]               = useState<"previews" | "intelligence">("previews");
  const [showLaunch, setShowLaunch] = useState(false);
  const [previewChannel, setPreviewChannel] = useState<AdChannel | "all">("all");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) onImageChange(campaign.id, ev.target.result as string); };
    reader.readAsDataURL(file);
  }

  function toggleVariation(id: string) {
    if (approved) return;
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function handleApprove() { onApprove(campaign.id, Array.from(selected)); setApproved(true); }

  const filteredVariations = previewChannel === "all"
    ? campaign.variations
    : campaign.variations.filter(v => v.channel === previewChannel);

  return (
    <div>
      <button onClick={onBack} className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-200">
        ← Back to campaigns
      </button>

      {/* Header */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{campaign.property}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[campaign.status]}`}>{STATUS_LABELS[campaign.status]}</span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{campaign.messaging_angle}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {campaign.recommended_channels.map(ch => <ChannelBadge key={ch} channel={ch} />)}
            <button
              onClick={() => setShowLaunch(true)}
              className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A50D25] transition-colors"
              style={{ boxShadow: "0 4px 12px rgba(200,16,46,0.25)" }}
            >
              Set Budget & Launch →
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 dark:border-white/5 sm:grid-cols-3">
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Created</p><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{campaign.created_at}</p></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Leads Generated</p><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{campaign.leads_generated}</p></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Special Offer</p><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{campaign.current_special ?? "—"}</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-gray-100 dark:border-white/5">
        {([{ key: "previews", label: "Ad Previews" }, { key: "intelligence", label: "✦ Intelligence" }] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === t.key ? "border-[#C8102E] text-[#C8102E]" : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "previews" && (
        <>
          {/* Image upload + channel filter */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Filter:</p>
              {(["all", "facebook", "instagram", "google"] as const).map(ch => (
                <button
                  key={ch}
                  onClick={() => setPreviewChannel(ch)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${previewChannel === ch ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400"}`}
                >
                  {ch === "all" ? "All" : ch.charAt(0).toUpperCase() + ch.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {imageUrl ? "Change Photo" : "Add Property Photo"}
              </button>
              {imageUrl && (
                <button onClick={() => onImageChange(campaign.id, "")} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Remove</button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
          </div>

          {imageUrl && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10 px-4 py-2.5 flex items-center gap-2">
              <img src={imageUrl} alt="Preview" className="h-8 w-12 rounded object-cover" />
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">Property photo added — visible in ad previews below</p>
            </div>
          )}

          {/* Ad preview grid */}
          <div className={`grid gap-4 ${filteredVariations.length === 1 ? "max-w-xs" : filteredVariations.length === 2 ? "grid-cols-2 max-w-lg" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
            {filteredVariations.map(v => (
              <div
                key={v.id}
                onClick={() => toggleVariation(v.id)}
                className={`transition-all ${!approved ? "cursor-pointer" : ""} ${!approved && selected.has(v.id) ? "ring-2 ring-[#C8102E] rounded-xl" : ""}`}
              >
                <AdPreviewCard variation={v} propertyName={campaign.property} imageUrl={imageUrl} />
                {!approved && (
                  <div className={`mt-2 flex items-center gap-2 px-1 ${selected.has(v.id) ? "text-[#C8102E]" : "text-gray-400"}`}>
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${selected.has(v.id) ? "border-[#C8102E] bg-[#C8102E]" : "border-gray-300 dark:border-white/20"}`}>
                      {selected.has(v.id) && <span className="text-[9px] text-white font-bold">✓</span>}
                    </div>
                    <span className="text-xs font-semibold">
                      {v.channel.charAt(0).toUpperCase() + v.channel.slice(1)} · Variation {v.variation_num}
                      {selected.has(v.id) ? " — Selected" : ""}
                    </span>
                  </div>
                )}
                {approved && v.approved && (
                  <p className="mt-1 px-1 text-xs font-semibold text-green-600 dark:text-green-400">✓ Approved & Live</p>
                )}
              </div>
            ))}
          </div>

          {/* Approve bar */}
          <div className="mt-6">
            {!approved && (
              <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/40 dark:bg-amber-900/10 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selected.size} variation{selected.size !== 1 ? "s" : ""} selected</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nothing goes live until you approve and set a budget</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleApprove} disabled={selected.size === 0} className="rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40">
                    Approve Variations →
                  </button>
                </div>
              </div>
            )}
            {approved && (
              <div className="flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 dark:border-green-900/40 dark:bg-green-900/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">Variations approved. Click &quot;Set Budget &amp; Launch&quot; to go live.</p>
                </div>
                <button onClick={() => setShowLaunch(true)} className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A50D25] transition-colors">
                  Set Budget & Launch →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "intelligence" && (
        <div className="space-y-4">
          <OfferLabPanel campaign={campaign} onLaunch={() => setShowLaunch(true)} />
          <CampaignOptimizePanel campaign={campaign} />
          <WhatIfPanel campaign={campaign} />
        </div>
      )}

      {showLaunch && (
        <LaunchModal
          campaign={campaign}
          imageUrl={imageUrl}
          onClose={() => setShowLaunch(false)}
          onLaunched={id => { onLaunched(id); setShowLaunch(false); }}
        />
      )}
    </div>
  );
}

// ─── New Campaign Modal ───────────────────────────────────────────────────────

type CampaignMode = "pick" | "manual" | "assisted" | "autopilot";

interface CampaignDraft {
  headline: string;
  subheadline: string;
  body_copy: string;
  offer: string;
  cta: string;
  messaging_angle: string;
  recommended_channels: string[];
  recommended_monthly_budget: number;
  predicted_leads_30d: number;
  predicted_leases_30d: number;
  rationale: string;
}

function ConfidenceBadge({ score, factors }: { score: number; factors?: string[] }) {
  const color = score >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${color}`}
      >
        {score}% confidence
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {open && factors && factors.length > 0 && (
        <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#1C1F2E] shadow-lg p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Score Breakdown</p>
          {factors.map((f, i) => (
            <p key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
              <span className="text-gray-300 dark:text-white/30 shrink-0">·</span>{f}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function DraftCard({ draft, label, highlight, confidenceScore, confidenceFactors }: {
  draft: CampaignDraft;
  label: string;
  highlight?: boolean;
  confidenceScore?: number;
  confidenceFactors?: string[];
}) {
  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${highlight ? "border-[#C8102E]/40 bg-[#C8102E]/4 dark:bg-[#C8102E]/8" : "border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5"}`}>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${highlight ? "text-[#C8102E]" : "text-gray-400"}`}>{label}</p>
        <div className="flex items-center gap-1.5">
          {confidenceScore != null && <ConfidenceBadge score={confidenceScore} factors={confidenceFactors} />}
          {highlight && <span className="rounded-full bg-[#C8102E] px-2 py-0.5 text-[9px] font-bold text-white">AI PICK</span>}
        </div>
      </div>
      <p className="text-base font-bold text-gray-800 dark:text-gray-100 leading-snug">{draft.headline}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{draft.subheadline}</p>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-white/10 pt-2">{draft.body_copy}</p>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <span className="rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-200">🎁 {draft.offer}</span>
        <span className="rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-200">→ {draft.cta}</span>
      </div>
      <div className="flex gap-3 pt-1 text-[10px] text-gray-400">
        <span>~{draft.predicted_leads_30d} leads/mo</span>
        <span>~{draft.predicted_leases_30d} leases/mo</span>
        <span>${draft.recommended_monthly_budget.toLocaleString()}/mo rec. budget</span>
      </div>
      {draft.rationale && <p className="text-[11px] text-gray-400 italic leading-relaxed">{draft.rationale}</p>}
    </div>
  );
}

function NewCampaignModal({
  onClose,
  operatorId,
  operatorEmail,
  onCreated,
}: {
  onClose: () => void;
  operatorId: string;
  operatorEmail: string;
  onCreated: (imageUrl?: string) => void;
}) {
  const [mode, setMode]           = useState<CampaignMode>("pick");
  const [properties, setProperties] = useState<{ id: string; name: string; city: string; state: string; total_units: number; occupied_units: number }[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [goalNote, setGoalNote]   = useState("");
  const [urgency, setUrgency]     = useState("normal");
  const [imagePreview, setImagePreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Manual mode fields
  const [manual, setManual] = useState({ headline: "", subheadline: "", body_copy: "", offer: "", cta: "Schedule a Tour", target: "" });

  // AI draft + refinement
  const [aiDraft, setAiDraft]         = useState<CampaignDraft | null>(null);
  const [draftConfidence, setDraftConfidence] = useState<{ score: number; factors: string[] } | null>(null);
  const [manualGrade, setManualGrade] = useState<{ grade: string; score: number; strengths: string[]; weaknesses: string[]; verdict: string } | null>(null);
  const [feedback, setFeedback]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [refining, setRefining]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [chosen, setChosen]           = useState<"ai" | "manual" | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  const selectedProperty = properties.find(p => p.id === propertyId);

  useEffect(() => {
    if (!operatorEmail) return;
    fetch(`/api/properties?email=${encodeURIComponent(operatorEmail)}`)
      .then(r => r.json())
      .then(d => setProperties(d.properties ?? []))
      .catch(() => {});
  }, [operatorEmail]);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function generate(manualVersion?: typeof manual) {
    if (!selectedProperty) return;
    setLoading(true);
    setError(null);
    setAiDraft(null);
    setManualGrade(null);
    try {
      const res = await fetch("/api/campaigns/draft", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_name:         selectedProperty.name,
          city:                  selectedProperty.city,
          state:                 selectedProperty.state,
          current_occupancy_pct: selectedProperty.total_units > 0
            ? Math.round((selectedProperty.occupied_units / selectedProperty.total_units) * 100)
            : 0,
          total_units: selectedProperty.total_units,
          goal_note:   goalNote,
          urgency,
          manual_version: manualVersion?.headline ? {
            headline: manualVersion.headline,
            body:     manualVersion.body_copy,
            offer:    manualVersion.offer,
            cta:      manualVersion.cta,
          } : undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? "Generation failed"); return; }
      setAiDraft(json.ai_version);
      if (json.confidence_score != null) setDraftConfidence({ score: json.confidence_score, factors: json.confidence_factors ?? [] });
      if (json.manual_grade) setManualGrade(json.manual_grade);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function refine() {
    if (!aiDraft || !feedback.trim() || !selectedProperty) return;
    setRefining(true);
    try {
      const res = await fetch("/api/campaigns/refine", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_draft:  aiDraft,
          feedback:       feedback.trim(),
          property_name:  selectedProperty.name,
          city:           selectedProperty.city,
          state:          selectedProperty.state,
        }),
      });
      const json = await res.json();
      if (json.ok) { setAiDraft(json.ai_version); setFeedback(""); }
    } catch { /* silent */ }
    finally { setRefining(false); }
  }

  async function saveCampaign() {
    if (!propertyId || !selectedProperty) return;
    setSaving(true);
    const finalDraft = (chosen === "manual" && aiDraft)
      ? { ...aiDraft, headline: manual.headline, body_copy: manual.body_copy, offer: manual.offer, cta: manual.cta }
      : aiDraft;
    try {
      await fetch("/api/campaigns", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id:       propertyId,
          operator_id:       operatorId,
          current_special:   finalDraft?.offer,
          target_renter_type: manual.target || undefined,
          urgency,
        }),
      });
      setSaved(true);
      setTimeout(() => { onCreated(imagePreview || undefined); }, 1200);
    } catch { setSaving(false); }
  }

  // ── Mode picker ─────────────────────────────────────────────────────────────

  if (mode === "pick") return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1C1F2E] my-auto">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/5">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">New Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6">
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">How do you want to build this campaign?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              { key: "manual",    icon: "✏️", title: "Build Manually",    desc: "You fill in every detail — headline, body, offer, CTA. AI grades your work and shows its version side-by-side." },
              { key: "assisted",  icon: "🤝", title: "AI-Assisted",       desc: "AI writes the full campaign. You review it, give feedback, and refine until it's exactly what you want." },
              { key: "autopilot", icon: "🚀", title: "AI Autopilot",      desc: "One click. AI handles everything — strategy, copy, offer, budget. Review and launch." },
            ] as { key: CampaignMode; icon: string; title: string; desc: string }[]).map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-gray-200 dark:border-white/10 p-4 text-left hover:border-[#C8102E] hover:bg-[#C8102E]/4 transition-colors group"
              >
                <span className="text-2xl">{m.icon}</span>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-[#C8102E]">{m.title}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Shared property selector ────────────────────────────────────────────────

  const PropertyPicker = () => (
    <div className="space-y-3 mb-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Property *</label>
        <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100">
          <option value="">Select a property…</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {/* Photo upload */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Property Photo <span className="text-gray-400 font-normal">(optional, used in ad previews)</span></label>
        <div onClick={() => fileRef.current?.click()} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition-colors ${imagePreview ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/10" : "border-gray-200 hover:border-gray-300 dark:border-white/10"}`}>
          {imagePreview
            ? <><img src={imagePreview} alt="" className="h-10 w-14 rounded object-cover" /><span className="text-sm text-green-700 dark:text-green-400">Photo ready · click to replace</span></>
            : <><svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-sm text-gray-400">Click to upload</span></>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>
    </div>
  );

  // ── Shared "save / confirmed" step ─────────────────────────────────────────

  const SaveBar = ({ label }: { label: string }) => (
    <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4">
      {saved
        ? <div className="flex items-center gap-2 text-green-600"><span className="text-lg">✓</span><span className="text-sm font-semibold">Campaign created!</span></div>
        : <button onClick={saveCampaign} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-50 transition-colors">
            {saving ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />Saving…</> : label}
          </button>
      }
      <button onClick={() => setMode("pick")} className="text-xs text-gray-400 hover:text-gray-600">← Change mode</button>
    </div>
  );

  // ── Feedback / refine row ───────────────────────────────────────────────────

  const RefineRow = () => (
    <div className="mt-3 flex gap-2">
      <input
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); refine(); } }}
        placeholder="What should change? (e.g. 'make the headline shorter', 'change offer to 2 weeks free')"
        className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]"
      />
      <button onClick={refine} disabled={!feedback.trim() || refining} className="rounded-lg bg-gray-800 dark:bg-white/10 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-gray-700 transition-colors">
        {refining ? "…" : "Refine"}
      </button>
    </div>
  );

  // ── MANUAL mode ─────────────────────────────────────────────────────────────

  if (mode === "manual") return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1C1F2E] my-auto">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/5">
          <div><h2 className="font-bold text-gray-900 dark:text-gray-100">Build Manually</h2><p className="text-xs text-gray-400 mt-0.5">Fill in your campaign — AI will compare and grade it</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-4">
          <PropertyPicker />

          {[
            { key: "headline",    label: "Headline *",         placeholder: "e.g. Your Next Home Awaits in Austin" },
            { key: "subheadline", label: "Subheadline",        placeholder: "e.g. Modern 1 & 2BRs · Pet friendly · Starting at $1,450" },
            { key: "offer",       label: "Special Offer *",    placeholder: "e.g. 6 weeks free on a 13-month lease" },
            { key: "cta",         label: "Call to Action",     placeholder: "e.g. Schedule a Tour" },
            { key: "target",      label: "Target Renter",      placeholder: "e.g. Young professionals, couples" },
          ].map(f => (
            <div key={f.key}>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{f.label}</label>
              <input
                value={(manual as Record<string, string>)[f.key]}
                onChange={e => setManual(m => ({ ...m, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
          ))}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Ad Body Copy *</label>
            <textarea
              value={manual.body_copy}
              onChange={e => setManual(m => ({ ...m, body_copy: e.target.value }))}
              rows={3}
              placeholder="e.g. Live steps from downtown Austin in a beautifully designed community. Spacious floor plans, resort-style pool, and co-working lounge — built for how you actually live."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400 resize-none"
            />
          </div>

          {error && <p className="rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

          {!aiDraft && (
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setMode("pick")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-white/10 dark:text-gray-400">← Back</button>
              <button
                onClick={() => generate(manual)}
                disabled={!propertyId || !manual.headline || !manual.offer || loading}
                className="flex items-center gap-2 rounded-lg bg-[#C8102E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40"
              >
                {loading ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />Comparing…</> : "Compare with AI →"}
              </button>
            </div>
          )}

          {aiDraft && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Comparison</p>

              {manualGrade && (
                <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-2xl font-black ${manualGrade.grade.startsWith("A") ? "text-green-600" : manualGrade.grade.startsWith("B") ? "text-blue-600" : "text-amber-600"}`}>{manualGrade.grade}</span>
                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Your version — {manualGrade.score}/10</p>
                      <p className="text-[11px] text-gray-400">{manualGrade.verdict}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[11px]">
                    <div className="space-y-0.5">{manualGrade.strengths.map((s, i) => <p key={i} className="text-green-600 dark:text-green-400">✓ {s}</p>)}</div>
                    <div className="space-y-0.5">{manualGrade.weaknesses.map((w, i) => <p key={i} className="text-red-500">✕ {w}</p>)}</div>
                  </div>
                </div>
              )}

              <DraftCard draft={aiDraft} label="AI Version" highlight confidenceScore={draftConfidence?.score} confidenceFactors={draftConfidence?.factors} />
              <RefineRow />

              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => { setChosen("manual"); }} className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${chosen === "manual" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 dark:border-white/10 dark:text-gray-300 hover:border-blue-400"}`}>Use My Version</button>
                <button onClick={() => { setChosen("ai"); }} className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${chosen === "ai" ? "border-[#C8102E] bg-[#C8102E]/10 text-[#C8102E]" : "border-gray-200 text-gray-600 dark:border-white/10 dark:text-gray-300 hover:border-[#C8102E]"}`}>Use AI Version</button>
              </div>

              {chosen && <SaveBar label={`Save & Continue with ${chosen === "ai" ? "AI" : "My"} Version →`} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── AI-ASSISTED mode ─────────────────────────────────────────────────────────

  if (mode === "assisted") return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1C1F2E] my-auto">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/5">
          <div><h2 className="font-bold text-gray-900 dark:text-gray-100">AI-Assisted Campaign</h2><p className="text-xs text-gray-400 mt-0.5">AI writes it — you refine until it's right</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-4">
          <PropertyPicker />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Campaign goal <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={goalNote} onChange={e => setGoalNote(e.target.value)} placeholder="e.g. Target young professionals, push 2BR units, emphasize rooftop amenity" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400" />
          </div>

          {error && <p className="rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

          {!aiDraft && !loading && (
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setMode("pick")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-white/10 dark:text-gray-400">← Back</button>
              <button onClick={() => generate()} disabled={!propertyId} className="rounded-lg bg-[#C8102E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40">
                Generate Campaign →
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="h-9 w-9 rounded-full border-4 border-[#C8102E]/20 border-t-[#C8102E] animate-spin" />
              <p className="text-sm text-gray-500">AI is writing your campaign…</p>
            </div>
          )}

          {aiDraft && (
            <div className="space-y-3">
              <DraftCard draft={aiDraft} label="AI-Generated Campaign" highlight confidenceScore={draftConfidence?.score} confidenceFactors={draftConfidence?.factors} />

              <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Like it? Or tell me what to change:</p>
                <RefineRow />
              </div>

              <SaveBar label="Looks good — Save Campaign →" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── AI AUTOPILOT mode ────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1C1F2E] my-auto">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/5">
          <div><h2 className="font-bold text-gray-900 dark:text-gray-100">AI Autopilot</h2><p className="text-xs text-gray-400 mt-0.5">Select a property — AI handles everything else</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-4">
          <PropertyPicker />

          {error && <p className="rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

          {!aiDraft && !loading && (
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setMode("pick")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-white/10 dark:text-gray-400">← Back</button>
              <button onClick={() => { setChosen("ai"); generate(); }} disabled={!propertyId} className="flex items-center gap-2 rounded-lg bg-[#C8102E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40">
                🚀 Let AI Do Everything
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="h-9 w-9 rounded-full border-4 border-[#C8102E]/20 border-t-[#C8102E] animate-spin" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">AI is building your campaign…</p>
              <p className="text-xs text-gray-400">Analyzing market, writing copy, setting strategy</p>
            </div>
          )}

          {aiDraft && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 px-3 py-2">
                <span className="text-green-600 text-lg">✓</span>
                <p className="text-xs font-semibold text-green-700 dark:text-green-400">Campaign built. Review and launch.</p>
              </div>
              <DraftCard draft={aiDraft} label="AI-Built Campaign" highlight confidenceScore={draftConfidence?.score} confidenceFactors={draftConfidence?.factors} />
              <RefineRow />
              <SaveBar label="Launch-Ready — Save Campaign →" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const router = useRouter();
  const [campaigns, setCampaigns]     = useState<Campaign[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [showNew, setShowNew]         = useState(false);
  const [filter, setFilter]           = useState<CampaignStatus | "all">("all");
  const [loading, setLoading]         = useState(true);
  const [operatorId, setOperatorId]   = useState("");
  const [operatorEmail, setOperatorEmail] = useState("");
  const [imageUrls, setImageUrls]     = useState<Record<string, string>>({});

  function normalizeCampaigns(raw: Record<string, unknown>[]): Campaign[] {
    return raw.map(c => ({
      id:                   c.id as string,
      property:             ((c.properties as Record<string, unknown>)?.name as string) ?? "Property",
      property_id:          c.property_id as string,
      operator_id:          c.operator_id as string,
      status:               (c.status as CampaignStatus) ?? "pending_approval",
      messaging_angle:      (c.messaging_angle as string) ?? "",
      recommended_channels: (c.recommended_channels as AdChannel[]) ?? [],
      urgency:              (c.urgency as string) ?? "normal",
      current_special:      (c.current_special as string | null) ?? null,
      created_at:           new Date(c.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      leads_generated:      (c.leads_generated as number) ?? 0,
      variations:           ((c.ad_variations as Record<string, unknown>[]) ?? []).map(v => ({
        id:            v.id as string,
        variation_num: v.variation_num as number,
        headline:      v.headline as string,
        primary_text:  v.primary_text as string,
        cta:           v.cta as string,
        channel:       v.channel as AdChannel,
        approved:      (v.status as string) === "approved",
      })),
    }));
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const email = await getOperatorEmail();
        if (!email) { router.push("/setup"); return; }
        setOperatorEmail(email);
        const setupRes = await fetch(`/api/setup?email=${encodeURIComponent(email)}`);
        const setupJson = await setupRes.json();
        const opId: string = setupJson.operator?.id;
        if (!opId) return;
        setOperatorId(opId);
        const res = await fetch(`/api/campaigns?operator_id=${opId}`);
        const json = await res.json();
        setCampaigns(normalizeCampaigns(json.campaigns ?? []));
      } finally { setLoading(false); }
    }
    load();
  }, [router]);

  function reloadCampaigns() {
    setLoading(true);
    (async () => {
      try {
        if (!operatorId) return;
        const res = await fetch(`/api/campaigns?operator_id=${operatorId}`);
        const json = await res.json();
        setCampaigns(normalizeCampaigns(json.campaigns ?? []));
      } finally { setLoading(false); }
    })();
  }

  function handleApprove(campaignId: string, variationIds: string[]) {
    setCampaigns(prev => prev.map(c => c.id !== campaignId ? c : { ...c, status: "approved" as CampaignStatus, variations: c.variations.map(v => ({ ...v, approved: variationIds.includes(v.id) })) }));
  }

  function handleLaunched(campaignId: string) {
    setCampaigns(prev => prev.map(c => c.id !== campaignId ? c : { ...c, status: "active" as CampaignStatus }));
  }

  function handleImageChange(campaignId: string, url: string) {
    setImageUrls(prev => ({ ...prev, [campaignId]: url }));
  }

  const selected = campaigns.find(c => c.id === selectedId) ?? null;
  const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);
  const totalLeads      = campaigns.reduce((s, c) => s + c.leads_generated, 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const pendingApproval = campaigns.filter(c => c.status === "pending_approval").length;

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {selected ? (
          <CampaignDetail
            campaign={selected}
            imageUrl={imageUrls[selected.id]}
            onBack={() => setSelectedId(null)}
            onApprove={handleApprove}
            onLaunched={handleLaunched}
            onImageChange={handleImageChange}
          />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Marketing</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI-generated ad campaigns · visual previews · budget forecasts</p>
              </div>
              <button onClick={() => setShowNew(true)} className="rounded-lg bg-[#C8102E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] transition-colors">
                + New Campaign
              </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  <span className="font-semibold">{pendingApproval} campaign{pendingApproval > 1 ? "s" : ""} waiting for your review.</span>{" "}
                  Approve ad variations and set a budget to go live.
                </p>
              </div>
            )}

            <div className="mb-4 flex gap-2 flex-wrap">
              {(["all", "pending_approval", "active", "approved", "paused"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${filter === f ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"}`}
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
                  className="relative rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-white/5 dark:bg-[#1C1F2E]"
                >
                  <div className="cursor-pointer" onClick={() => setSelectedId(campaign.id)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{campaign.property}</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[campaign.status]}`}>{STATUS_LABELS[campaign.status]}</span>
                          {campaign.urgency === "high" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">High urgency</span>}
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
                      <span>{campaign.variations.length} ad variations</span>
                      {campaign.current_special && <span>· {campaign.current_special}</span>}
                      <span>· {campaign.created_at}</span>
                      {imageUrls[campaign.id] && <span className="text-green-600 dark:text-green-400">· Photo added</span>}
                    </div>
                  </div>
                  <button
                    onClick={async e => {
                      e.stopPropagation();
                      if (!confirm("Delete this campaign?")) return;
                      await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
                      setCampaigns(prev => prev.filter(c => c.id !== campaign.id));
                    }}
                    className="absolute right-3 top-3 rounded px-2 py-0.5 text-[11px] font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showNew && (
        <NewCampaignModal
          onClose={() => setShowNew(false)}
          operatorId={operatorId}
          operatorEmail={operatorEmail}
          onCreated={(imgUrl) => {
            setShowNew(false);
            reloadCampaigns();
            if (imgUrl) {
              // Will be set after campaigns reload and we know the new campaign id
              // For now image is associated when user opens the campaign
              setTimeout(() => {
                setCampaigns(prev => {
                  const newest = prev[prev.length - 1];
                  if (newest && imgUrl) setImageUrls(u => ({ ...u, [newest.id]: imgUrl }));
                  return prev;
                });
              }, 500);
            }
          }}
        />
      )}
    </div>
  );
}
