"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadSource {
  name: string;
  leads: number;
  tours: number;
  apps: number;
  move_ins: number;
  cost_per_lead?: number;
}

interface FunnelStage {
  label: string;
  value: number;
  pct_of_top?: number;
  note?: string;
}

interface Issue {
  type: "warning" | "critical" | "opportunity";
  title: string;
  body: string;
  action?: string;
  href?: string;
}

interface Activity {
  id: string;
  lead: string;
  event: string;
  actor: "AI" | "Lead" | "System" | "Agent";
  time: string;
  status?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const PROPERTY = {
  id: "prop-1",
  name: "The Monroe",
  address: "3740 Desert Rose Blvd",
  city: "Las Vegas",
  state: "NV",
  zip: "89101",
  units: 48,
  occupied: 43,
  ai_number: "+1 (702) 555-0100",
  manager: "Marcus Thompson",
  active_special: "1 month free on 12-month leases",
  avg_rent: 1_485,
};

const FUNNEL: FunnelStage[] = [
  { label: "Leads",                  value: 64 },
  { label: "Tours",                  value: 18, note: "28% tour rate" },
  { label: "Applications Started",   value: 9,  note: "50% of toured" },
  { label: "Applications Completed", value: 5,  note: "56% completion" },
  { label: "Move-ins",               value: 3,  note: "60% of completed" },
];

const SOURCES: LeadSource[] = [
  { name: "Zillow",   leads: 24, tours: 9,  apps: 4, move_ins: 2, cost_per_lead: 32 },
  { name: "Website",  leads: 18, tours: 5,  apps: 3, move_ins: 1, cost_per_lead: 0  },
  { name: "Facebook", leads: 12, tours: 2,  apps: 1, move_ins: 0, cost_per_lead: 18 },
  { name: "ILS",      leads: 7,  tours: 1,  apps: 0, move_ins: 0, cost_per_lead: 41 },
  { name: "Referral", leads: 3,  tours: 1,  apps: 1, move_ins: 1, cost_per_lead: 0  },
];

const PERF = [
  { label: "Avg. First Response",     value: "1m 08s",  benchmark: "< 5 min",  good: true  },
  { label: "Follow-up Completion",    value: "84%",     benchmark: "> 80%",    good: true  },
  { label: "No-Show Rate",            value: "22%",     benchmark: "< 15%",    good: false },
  { label: "Application Completion",  value: "56%",     benchmark: "> 70%",    good: false },
  { label: "Avg. AI Lead Score",      value: "6.4 / 10", benchmark: "> 6.0",   good: true  },
  { label: "Tour → App Rate",         value: "50%",     benchmark: "> 55%",    good: false },
];

const ISSUES: Issue[] = [
  {
    type: "critical",
    title: "High no-show rate (22%)",
    body: "1 in 5 tours is resulting in a no-show. The AI reminder is running 24h in advance — consider adding a 2-hour day-of reminder to reduce drop-off.",
    action: "Edit automation",
    href: "/automations",
  },
  {
    type: "warning",
    title: "Application drop-off after tour",
    body: "Only 9 of 18 toured leads have started an application (50%). The industry average is 65%. Consider sending the application link immediately after tour completion.",
    action: "Create nudge",
    href: "/automations",
  },
  {
    type: "critical",
    title: "5 applications stalled > 5 days",
    body: "Jordan Ellis, Priya Sharma, and 3 others started applications but haven't completed them. The application nudge automation is in Draft — publish it to recover these leads.",
    action: "View leads",
    href: "/leads?property=prop-1&status=applied",
  },
  {
    type: "warning",
    title: "Facebook ROI is negative",
    body: "Facebook-sourced leads have a 17% tour rate and 0 move-ins this month vs. $18 cost-per-lead. Zillow is converting 4× better at $32 CPL. Consider reallocating budget.",
  },
  {
    type: "opportunity",
    title: "Referral channel outperforming",
    body: "Referrals convert to move-ins at 33% — the highest of any source. You have 3 current residents. A small referral incentive could meaningfully increase lead volume at $0 CPL.",
  },
];

const ACTIVITY: Activity[] = [
  { id: "a1", lead: "Jordan Ellis",   event: "Tour completed — no application yet",        actor: "System", time: "2h ago",  status: "tour_scheduled" },
  { id: "a2", lead: "Priya Sharma",   event: "AI sent follow-up: application reminder",    actor: "AI",     time: "4h ago" },
  { id: "a3", lead: "Carlos Reyes",   event: "Application started (step 1 of 4)",          actor: "Lead",   time: "6h ago",  status: "applied" },
  { id: "a4", lead: "Maya Thompson",  event: "Replied to AI: 'Can I reschedule my tour?'",  actor: "Lead",   time: "8h ago" },
  { id: "a5", lead: "Sofia Ruiz",     event: "New lead — AI replied in 48s",               actor: "AI",     time: "10h ago", status: "new" },
  { id: "a6", lead: "Derek Nguyen",   event: "Silent 11 days — flagged for manual review", actor: "System", time: "1d ago",  status: "contacted" },
  { id: "a7", lead: "Aisha Patel",    event: "Lease signed — move-in June 1",              actor: "Agent",  time: "2d ago",  status: "applied" },
  { id: "a8", lead: "Liam Chen",      event: "Tour reminder sent (24h in advance)",        actor: "AI",     time: "2d ago",  status: "tour_scheduled" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

const ACTOR_STYLES: Record<Activity["actor"], string> = {
  AI:     "bg-violet-50 text-violet-700",
  Lead:   "bg-blue-50 text-blue-700",
  System: "bg-gray-100 text-gray-600",
  Agent:  "bg-green-50 text-green-700",
};

const ISSUE_STYLES: Record<Issue["type"], { bar: string; icon: string; badge: string; badgeText: string }> = {
  critical:    { bar: "bg-red-500",   icon: "✕", badge: "bg-red-50 text-red-700",     badgeText: "Critical" },
  warning:     { bar: "bg-amber-400", icon: "⚠", badge: "bg-amber-50 text-amber-700", badgeText: "Warning" },
  opportunity: { bar: "bg-blue-400",  icon: "→", badge: "bg-blue-50 text-blue-700",   badgeText: "Opportunity" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────


function MetricCell({ label, value, good, benchmark }: { label: string; value: string; good: boolean; benchmark: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", good ? "text-gray-900" : "text-red-500")}>{value}</p>
      <p className={cn("mt-0.5 text-[11px]", good ? "text-green-600" : "text-gray-400")}>
        {good ? "✓" : "↓"} Benchmark: {benchmark}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertyDetailPage() {
  const occupied   = PROPERTY.occupied;
  const units      = PROPERTY.units;
  const available  = units - occupied;
  const occPct     = pct(occupied, units);
  const occColor   = occPct >= 90 ? "text-green-600" : occPct >= 78 ? "text-amber-600" : "text-red-500";

  const funnelMax = FUNNEL[0].value;
  const criticalCount = ISSUES.filter((i) => i.type === "critical").length;

  return (
    <div className="space-y-8 p-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        {/* Breadcrumb */}
        <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-400">
          <Link href="/properties" className="hover:text-gray-700 transition-colors">Properties</Link>
          <span>/</span>
          <span className="text-gray-600">{PROPERTY.name}</span>
        </div>

        <div className="flex flex-wrap items-start gap-6">
          {/* Identity */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{PROPERTY.name}</h1>
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                Active
              </span>
              {criticalCount > 0 && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                  {criticalCount} critical {criticalCount === 1 ? "issue" : "issues"}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {PROPERTY.address} · {PROPERTY.city}, {PROPERTY.state} {PROPERTY.zip}
            </p>
            {PROPERTY.active_special && (
              <p className="mt-1.5 text-xs text-amber-600">
                Special offer: {PROPERTY.active_special}
              </p>
            )}
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: "Occupancy",      value: `${occPct}%`,       valueClass: occColor },
              { label: "Available",      value: `${available} units` },
              { label: "Avg Rent",       value: `$${PROPERTY.avg_rent.toLocaleString()}` },
              { label: "AI Number",      value: PROPERTY.ai_number,  mono: true },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm">
                <p className="text-[10px] font-medium text-gray-400">{s.label}</p>
                <p className={cn("mt-0.5 text-sm font-bold text-gray-900", s.valueClass, s.mono && "font-mono")}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <Link
              href={`/leads?property=${PROPERTY.id}`}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              View Leads
            </Link>
            <Link
              href="/calendar"
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Calendar
            </Link>
            <button className="rounded-lg bg-[#C8102E] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#A50D25]">
              Edit Property
            </button>
          </div>
        </div>
      </div>

      {/* ── Conversion Funnel ───────────────────────────────────────────── */}
      <div>
        <SectionLabel>Conversion Funnel — This Month</SectionLabel>
        <Card padding="none">
          <div className="flex divide-x divide-gray-50">
            {FUNNEL.map((stage, i) => {
              const widthPct = pct(stage.value, funnelMax);
              const convPct  = i === 0 ? 100 : pct(stage.value, FUNNEL[i - 1].value);
              const isWeak   = i > 0 && convPct < 50;
              return (
                <div key={stage.label} className="flex flex-1 flex-col gap-3 p-5">
                  {/* Stage number */}
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                      {i + 1}
                    </span>
                    <p className="text-[11px] font-semibold text-gray-500">{stage.label}</p>
                  </div>

                  {/* Bar */}
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn("h-full rounded-full", isWeak ? "bg-red-400" : "bg-[#C8102E]")}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>

                  {/* Value */}
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stage.value}</p>
                    {stage.note && (
                      <p className={cn("mt-0.5 text-[11px]", isWeak ? "text-red-500" : "text-gray-400")}>
                        {stage.note}
                      </p>
                    )}
                  </div>

                  {/* Step conversion */}
                  {i > 0 && (
                    <div className={cn(
                      "mt-auto rounded-lg px-2 py-1 text-center text-[10px] font-semibold",
                      isWeak ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"
                    )}>
                      {convPct}% from prev
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Lead Source Performance ─────────────────────────────────────── */}
      <div>
        <SectionLabel>Lead Source Performance</SectionLabel>
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Source", "Leads", "Tours", "Tour Rate", "Apps", "Move-ins", "Conv. Rate", "CPL"].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400",
                      h === "Source" ? "text-left" : "text-right"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {SOURCES.sort((a, b) => b.move_ins - a.move_ins).map((src) => {
                const tourRate   = pct(src.tours, src.leads);
                const convRate   = pct(src.move_ins, src.leads);
                const isTopSrc   = src.move_ins === Math.max(...SOURCES.map((s) => s.move_ins));
                const isDead     = src.move_ins === 0 && src.leads >= 7;
                return (
                  <tr key={src.name} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{src.name}</span>
                        {isTopSrc && (
                          <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                            Top source
                          </span>
                        )}
                        {isDead && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                            0 move-ins
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-700">{src.leads}</td>
                    <td className="px-5 py-3.5 text-right text-gray-700">{src.tours}</td>
                    <td className={cn("px-5 py-3.5 text-right font-medium", tourRate >= 35 ? "text-green-600" : tourRate < 20 ? "text-red-500" : "text-gray-700")}>
                      {tourRate}%
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-700">{src.apps}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={cn("font-semibold", src.move_ins > 0 ? "text-gray-900" : "text-gray-400")}>
                        {src.move_ins}
                      </span>
                    </td>
                    <td className={cn("px-5 py-3.5 text-right font-semibold", convRate >= 8 ? "text-green-600" : convRate === 0 ? "text-red-500" : "text-gray-700")}>
                      {convRate}%
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-500">
                      {src.cost_per_lead === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        `$${src.cost_per_lead}`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* ── Leasing Performance ─────────────────────────────────────────── */}
      <div>
        <SectionLabel>Leasing Performance</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PERF.map((m) => (
            <MetricCell key={m.label} label={m.label} value={m.value} good={m.good} benchmark={m.benchmark} />
          ))}
        </div>
      </div>

      {/* ── Issues & Opportunities ──────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <SectionLabel>Issues & Opportunities</SectionLabel>
          <span className="text-xs text-gray-400">{criticalCount} critical · {ISSUES.filter(i => i.type === "warning").length} warnings · {ISSUES.filter(i => i.type === "opportunity").length} opportunities</span>
        </div>
        <div className="space-y-3">
          {ISSUES.map((issue, i) => {
            const s = ISSUE_STYLES[issue.type];
            return (
              <div key={i} className="relative flex gap-4 overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className={cn("absolute bottom-0 left-0 top-0 w-1", s.bar)} />
                <div className="ml-3 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", s.badge)}>
                          {s.icon} {s.badgeText}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold text-gray-900">{issue.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">{issue.body}</p>
                    </div>
                  </div>
                  {issue.action && issue.href && (
                    <Link href={issue.href} className="mt-3 inline-block text-xs font-medium text-[#C8102E] hover:underline">
                      {issue.action} →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recent Lead Activity ────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <SectionLabel>Recent Lead Activity</SectionLabel>
          <Link
            href={`/leads?property=${PROPERTY.id}`}
            className="text-xs font-medium text-[#C8102E] hover:underline"
          >
            View all leads →
          </Link>
        </div>
        <Card padding="none">
          <div className="divide-y divide-gray-50">
            {ACTIVITY.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                  {item.lead.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{item.lead}</span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", ACTOR_STYLES[item.actor])}>
                      {item.actor}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{item.event}</p>
                </div>

                {/* Time */}
                <span className="shrink-0 text-[11px] text-gray-400">{item.time}</span>

                {/* Link */}
                <Link
                  href={`/leads?lead=${item.id}`}
                  className="shrink-0 text-[11px] font-medium text-gray-400 transition-colors hover:text-[#C8102E]"
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}
