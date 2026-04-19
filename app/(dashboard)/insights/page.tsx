"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/ui/SectionLabel";

// ─── Mock data ────────────────────────────────────────────────────────────────

const WEEKLY_LEADS = [
  { week: "Mar 3",  leads: 14, tours: 4, apps: 2 },
  { week: "Mar 10", leads: 18, tours: 6, apps: 3 },
  { week: "Mar 17", leads: 12, tours: 3, apps: 1 },
  { week: "Mar 24", leads: 22, tours: 8, apps: 4 },
  { week: "Mar 31", leads: 19, tours: 5, apps: 3 },
  { week: "Apr 7",  leads: 25, tours: 9, apps: 5 },
  { week: "Apr 14", leads: 28, tours: 7, apps: 4 },
  { week: "Apr 21", leads: 24, tours: 7, apps: 3 },
];

const SOURCES = [
  { name: "Zillow",   leads: 24, tours: 9,  move_ins: 2, color: "#6366F1" },
  { name: "Website",  leads: 18, tours: 5,  move_ins: 1, color: "#22C55E" },
  { name: "Facebook", leads: 12, tours: 2,  move_ins: 0, color: "#F59E0B" },
  { name: "Referral", leads: 3,  tours: 1,  move_ins: 1, color: "#06B6D4" },
  { name: "ILS",      leads: 7,  tours: 1,  move_ins: 0, color: "#8B5CF6" },
];

const RESPONSE_TREND = [
  { week: "Mar 3",  seconds: 204 },
  { week: "Mar 10", seconds: 186 },
  { week: "Mar 17", seconds: 170 },
  { week: "Mar 24", seconds: 148 },
  { week: "Mar 31", seconds: 135 },
  { week: "Apr 7",  seconds: 112 },
  { week: "Apr 14", seconds: 98  },
  { week: "Apr 21", seconds: 68  },
];

const FUNNEL = [
  { label: "Leads",           value: 64, color: "#6366F1" },
  { label: "Contacted",       value: 58, color: "#06B6D4" },
  { label: "Toured",          value: 18, color: "#F59E0B" },
  { label: "Applied",         value: 9,  color: "#F97316" },
  { label: "Moved In",        value: 3,  color: "#22C55E" },
];

const RECS = [
  {
    id: "r1", type: "risk" as const,
    title: "No-show rate is 22% — above the 15% benchmark",
    body: "1 in 5 scheduled tours is resulting in a no-show. A same-day SMS reminder (2h before) reduces no-shows by ~30%.",
    property: "The Monroe", impact: "high", impact_label: "+1–2 tours/wk recovered",
    action: "Add same-day reminder", href: "/automations",
  },
  {
    id: "r2", type: "risk" as const,
    title: "5 applications stalled — $7,425/mo in potential ARR",
    body: "Jordan Ellis, Priya Sharma, and 3 others started applications but haven't completed them. The nudge automation is still in Draft.",
    property: "All Properties", impact: "high", impact_label: "~$7,425/mo recoverable ARR",
    action: "Publish automation", href: "/automations",
  },
  {
    id: "r3", type: "opportunity" as const,
    title: "Referral leads convert at 33% — 4× better than Facebook",
    body: "3 current residents. A small incentive ($100 off next month) could generate 2–3 free leads/mo at $0 CPL.",
    property: "All Properties", impact: "medium", impact_label: "2–3 free leads/mo",
    action: "Create referral template", href: "/automations",
  },
  {
    id: "r4", type: "opportunity" as const,
    title: "Vista on 5th at 64% — a stronger special could accelerate leasing",
    body: "23 available units, only 3 leads this week. A time-limited special could spike ILS/Zillow traffic and create urgency.",
    property: "Vista on 5th", impact: "high", impact_label: "23 units · $34,155/mo gap",
    action: "Update special", href: "/properties/prop-4",
  },
  {
    id: "r5", type: "info" as const,
    title: "AI response time improved 63% — engagement rate up 2.4×",
    body: "Avg first reply is now 1m 08s vs 3m 24s last month. Leads who receive a reply within 60s engage at 2.4× higher rate.",
    property: "All Properties", impact: "low", impact_label: "No action needed",
    action: undefined, href: undefined,
  },
];

const PROPERTIES_FOR_REPORT = [
  "All Properties", "The Monroe", "Parkview Commons", "Sonoran Ridge",
  "Vista on 5th", "Creekside at Summerlin", "Desert Bloom",
];

const METRICS_FOR_REPORT = [
  { id: "occupancy",      label: "Occupancy & Availability" },
  { id: "leads",          label: "Lead Volume & Sources" },
  { id: "conversion",     label: "Conversion Funnel" },
  { id: "response_time",  label: "AI Response Times" },
  { id: "tours",          label: "Tour Performance & No-shows" },
  { id: "applications",   label: "Application Completion" },
];

// ─── Chart helpers ────────────────────────────────────────────────────────────

function BarChart() {
  const max = Math.max(...WEEKLY_LEADS.map((w) => w.leads));
  const H = 80, W = 260, barW = 20, gap = 12;
  const totalW = WEEKLY_LEADS.length * (barW + gap) - gap;
  const xOffset = (W - totalW) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full">
      {WEEKLY_LEADS.map((w, i) => {
        const x = xOffset + i * (barW + gap);
        const barH = (w.leads / max) * H;
        const tourH = (w.tours / max) * H;
        return (
          <g key={w.week}>
            {/* Lead bar */}
            <rect x={x} y={H - barH} width={barW * 0.55} height={barH} rx={3} fill="#6366F1" opacity={0.85} />
            {/* Tour bar */}
            <rect x={x + barW * 0.6} y={H - tourH} width={barW * 0.4} height={tourH} rx={2} fill="#06B6D4" opacity={0.75} />
            {/* Week label */}
            <text x={x + barW / 2} y={H + 16} textAnchor="middle" style={{ fontSize: 6, fill: "#9CA3AF" }}>
              {w.week.split(" ")[1]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart() {
  const max = Math.max(...RESPONSE_TREND.map((d) => d.seconds));
  const min = Math.min(...RESPONSE_TREND.map((d) => d.seconds));
  const H = 70, W = 240, n = RESPONSE_TREND.length;
  const pad = 10;
  const pts = RESPONSE_TREND.map((d, i) => {
    const x = pad + (i / (n - 1)) * (W - pad * 2);
    const y = H - pad - ((d.seconds - min) / (max - min + 1)) * (H - pad * 2);
    return { x, y, ...d };
  });
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${pts[0].x},${H} ` + pts.map((p) => `${p.x},${p.y}`).join(" ") + ` ${pts[pts.length - 1].x},${H}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8102E" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#C8102E" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#lineGrad)" />
      <polyline points={polyline} fill="none" stroke="#C8102E" strokeWidth={1.5} strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2} fill="#C8102E" />
      ))}
      {/* First + last labels */}
      <text x={pts[0].x} y={pts[0].y - 5} textAnchor="middle" style={{ fontSize: 6, fill: "#6B7280" }}>
        {Math.round(pts[0].seconds / 60)}m {pts[0].seconds % 60}s
      </text>
      <text x={pts[pts.length - 1].x} y={pts[pts.length - 1].y - 5} textAnchor="middle" style={{ fontSize: 6, fill: "#C8102E", fontWeight: 600 }}>
        1m 08s
      </text>
    </svg>
  );
}

function SourceChart() {
  const maxLeads = Math.max(...SOURCES.map((s) => s.leads));
  return (
    <div className="space-y-3">
      {SOURCES.map((src) => (
        <div key={src.name}>
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: src.color }} />
              <span className="text-xs font-medium text-gray-700">{src.name}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-500">
              <span>{src.leads} leads</span>
              <span>{src.tours} tours</span>
              <span className={src.move_ins > 0 ? "font-semibold text-green-600" : "text-gray-400"}>
                {src.move_ins} move-ins
              </span>
            </div>
          </div>
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-gray-100">
            <div style={{ width: `${(src.leads / maxLeads) * 100}%`, backgroundColor: src.color, opacity: 0.9 }} className="rounded-full" />
          </div>
          <div className="mt-0.5 flex gap-0.5">
            <div style={{ width: `${(src.tours / maxLeads) * 100}%`, height: 3, backgroundColor: src.color, opacity: 0.5 }} className="rounded-full" />
            <div style={{ width: `${(src.move_ins / maxLeads) * 100}%`, height: 3, backgroundColor: src.color }} className="rounded-full" />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 pt-1 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-gray-300 opacity-90" /> Leads</span>
        <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-3 rounded-sm bg-gray-300 opacity-50" /> Tours</span>
        <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-3 rounded-sm bg-gray-300" /> Move-ins</span>
      </div>
    </div>
  );
}

function FunnelChart() {
  const max = FUNNEL[0].value;
  return (
    <div className="space-y-2">
      {FUNNEL.map((stage, i) => {
        const pct = Math.round((stage.value / max) * 100);
        const convPct = i === 0 ? null : Math.round((stage.value / FUNNEL[i - 1].value) * 100);
        return (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-gray-600">{stage.label}</span>
              <div className="flex items-center gap-2">
                {convPct !== null && (
                  <span className={cn("text-[10px] font-medium", convPct < 50 ? "text-red-500" : "text-gray-400")}>
                    {convPct}% of prev
                  </span>
                )}
                <span className="w-6 text-right text-xs font-bold text-gray-900">{stage.value}</span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: stage.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const REC_STYLES = {
  risk:        { bar: "bg-red-500",   badge: "bg-red-50 text-red-700",     icon: "↓", label: "Risk" },
  opportunity: { bar: "bg-blue-500",  badge: "bg-blue-50 text-blue-700",   icon: "→", label: "Opportunity" },
  info:        { bar: "bg-green-500", badge: "bg-green-50 text-green-700", icon: "✓", label: "Insight" },
};

const IMPACT_BADGE: Record<string, string> = {
  high:   "bg-orange-50 text-orange-700",
  medium: "bg-amber-50 text-amber-700",
  low:    "bg-gray-100 text-gray-500",
};

// ─── Report Generator ─────────────────────────────────────────────────────────

function ReportGenerator() {
  const [property, setProperty]       = useState("All Properties");
  const [dateFrom, setDateFrom]       = useState("2026-03-01");
  const [dateTo, setDateTo]           = useState("2026-04-19");
  const [format, setFormat]           = useState<"csv" | "pdf">("csv");
  const [metrics, setMetrics]         = useState<string[]>(METRICS_FOR_REPORT.map((m) => m.id));
  const [generating, setGenerating]   = useState(false);
  const [generated, setGenerated]     = useState(false);

  function toggleMetric(id: string) {
    setMetrics((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  }

  function handleExport() {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      // Build mock CSV
      const rows = [
        ["Property", "Period", "Occupancy %", "Active Leads", "Tours", "Applications", "Move-ins", "Avg Response Time"],
        ["The Monroe",             `${dateFrom} – ${dateTo}`, "90%",  "9",  "4", "2", "1", "1m 08s"],
        ["Parkview Commons",       `${dateFrom} – ${dateTo}`, "88%",  "6",  "2", "1", "0", "1m 22s"],
        ["Sonoran Ridge",          `${dateFrom} – ${dateTo}`, "91%",  "14", "7", "4", "2", "0m 58s"],
        ["Vista on 5th",           `${dateFrom} – ${dateTo}`, "64%",  "3",  "1", "0", "0", "2m 11s"],
        ["Creekside at Summerlin", `${dateFrom} – ${dateTo}`, "95%",  "8",  "5", "3", "2", "1m 03s"],
        ["Desert Bloom",           `${dateFrom} – ${dateTo}`, "69%",  "2",  "1", "0", "0", "1m 45s"],
      ];
      if (property !== "All Properties") {
        rows.splice(1); // keep header only then add matching row
        const match = rows.slice(1).find((r) => r[0] === property);
        if (match) rows.push(match);
      }
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LUB_Performance_Report_${dateFrom}_${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setTimeout(() => setGenerated(false), 3000);
    }, 1400);
  }

  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      <div className="border-b border-gray-50 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Export Performance Report</h3>
            <p className="mt-0.5 text-xs text-gray-400">Generate a report for any time period and property</p>
          </div>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-600">
            CSV · PDF
          </span>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Property */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Property</label>
          <select
            value={property}
            onChange={(e) => setProperty(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 focus:border-gray-400 focus:outline-none"
          >
            {PROPERTIES_FOR_REPORT.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>

        {/* Date from */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
          />
        </div>

        {/* Date to */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
          />
        </div>

        {/* Format */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Format</label>
          <div className="flex rounded-xl border border-gray-200 bg-white p-0.5">
            {(["csv", "pdf"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                  format === f ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="border-t border-gray-50 px-6 py-4">
        <p className="mb-3 text-xs font-medium text-gray-600">Include in report</p>
        <div className="flex flex-wrap gap-2">
          {METRICS_FOR_REPORT.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleMetric(m.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                metrics.includes(m.id)
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              )}
            >
              {metrics.includes(m.id) && <span className="mr-1">✓</span>}
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Export button */}
      <div className="flex items-center justify-between border-t border-gray-50 px-6 py-4">
        <p className="text-[11px] text-gray-400">
          Report will include data for <span className="font-medium text-gray-700">{property}</span> from{" "}
          <span className="font-medium text-gray-700">{dateFrom}</span> to{" "}
          <span className="font-medium text-gray-700">{dateTo}</span>
        </p>
        <button
          onClick={handleExport}
          disabled={generating || metrics.length === 0}
          className={cn(
            "rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors",
            generated
              ? "bg-green-500 text-white"
              : generating
              ? "cursor-not-allowed bg-gray-200 text-gray-500"
              : "bg-[#C8102E] text-white hover:bg-[#A50D25]"
          )}
        >
          {generated ? "✓ Downloading…" : generating ? "Generating…" : `Export ${format.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [dismissed, setDismissed]       = useState<string[]>([]);
  const [typeFilter, setTypeFilter]     = useState<"all" | "risk" | "opportunity" | "info">("all");

  const visibleRecs = RECS.filter((r) => {
    if (dismissed.includes(r.id)) return false;
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8 p-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">AI Insights</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Generated from lead, tour, and conversion data · Last updated Apr 19, 2026
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          Powered by Claude
        </span>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Biggest Risk",          value: "22% no-show rate",       sub: "The Monroe · Above 15% threshold",         type: "risk",        icon: "↓" },
          { label: "Biggest Opportunity",   value: "5 stalled applications", sub: "~$7,425/mo ARR at risk",                   type: "opportunity", icon: "→" },
          { label: "Strongest Lead Source", value: "Zillow (33% conv.)",     sub: "Referral close behind · $0 CPL",           type: "info",        icon: "✓" },
          { label: "Weakest Funnel Step",   value: "Tour → Application",     sub: "50% vs. 65% benchmark · −15pts gap",       type: "risk",        icon: "↓" },
        ].map((c) => {
          const styles = {
            risk:        { bg: "bg-red-50",   text: "text-red-700",   border: "border-red-100",   iconBg: "bg-red-100" },
            opportunity: { bg: "bg-blue-50",  text: "text-blue-700",  border: "border-blue-100",  iconBg: "bg-blue-100" },
            info:        { bg: "bg-green-50", text: "text-green-700", border: "border-green-100", iconBg: "bg-green-100" },
          }[c.type]!;
          return (
            <div key={c.label} className={cn("rounded-2xl border p-4 shadow-sm", styles.bg, styles.border)}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{c.label}</p>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", styles.iconBg, styles.text)}>
                  {c.icon}
                </span>
              </div>
              <p className={cn("mt-2 text-sm font-bold leading-snug", styles.text)}>{c.value}</p>
              <p className="mt-1 text-[11px] text-gray-500">{c.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Lead Volume Bar Chart */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Lead Volume</h3>
            <span className="text-[11px] text-gray-400">8-week trend</span>
          </div>
          <p className="mb-3 text-xs text-gray-400">Leads (dark) vs Tours (teal) per week</p>
          <BarChart />
          <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-indigo-400 opacity-85" /> Leads</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-cyan-400 opacity-75" /> Tours</span>
          </div>
        </div>

        {/* Response Time Line */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">AI Response Time</h3>
            <span className="text-[11px] text-green-600 font-medium">↓ 63%</span>
          </div>
          <p className="mb-3 text-xs text-gray-400">Avg. first reply time · seconds · 8 weeks</p>
          <LineChart />
          <p className="mt-2 text-[11px] text-gray-400">
            From <span className="font-medium text-gray-700">3m 24s</span> → <span className="font-semibold text-[#C8102E]">1m 08s</span>
          </p>
        </div>

        {/* Conversion Funnel */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Conversion Funnel</h3>
            <span className="text-[11px] text-gray-400">This month</span>
          </div>
          <p className="mb-3 text-xs text-gray-400">All properties · lead → move-in</p>
          <FunnelChart />
        </div>
      </div>

      {/* Lead Source Chart */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Lead Source Performance</h3>
          <span className="text-[11px] text-gray-400">All properties · this month</span>
        </div>
        <p className="mb-4 text-xs text-gray-400">Comparing volume, tour rate, and move-in conversion by channel</p>
        <SourceChart />
      </div>

      {/* ── Recommendations ─────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <SectionLabel>Recommendations</SectionLabel>
            <p className="-mt-3 mb-4 text-xs text-gray-500">
              {RECS.filter(r => r.type === "risk").length} risks · {RECS.filter(r => r.type === "opportunity").length} opportunities · {RECS.filter(r => r.type === "info").length} insights
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {(["all", "risk", "opportunity", "info"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  typeFilter === f ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                {f === "info" ? "Insights" : f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {visibleRecs.map((rec) => {
            const s = REC_STYLES[rec.type];
            return (
              <div key={rec.id} className="relative flex gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className={cn("absolute bottom-0 left-0 top-0 w-1", s.bar)} />
                <div className="ml-3 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", s.badge)}>{s.icon} {s.label}</span>
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", IMPACT_BADGE[rec.impact])}>{rec.impact_label}</span>
                        <span className="text-[10px] text-gray-400">{rec.property}</span>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">{rec.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">{rec.body}</p>
                      {rec.action && rec.href && (
                        <Link href={rec.href} className="mt-3 inline-block text-xs font-semibold text-[#C8102E] hover:underline">{rec.action} →</Link>
                      )}
                    </div>
                    <button
                      onClick={() => setDismissed((d) => [...d, rec.id])}
                      className="shrink-0 rounded-lg border border-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-400 transition-colors hover:bg-gray-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {visibleRecs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <p className="text-sm text-gray-400">No recommendations match this filter.</p>
              <button onClick={() => { setTypeFilter("all"); setDismissed([]); }} className="mt-2 text-xs font-medium text-[#C8102E] hover:underline">Reset</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Report Generator ─────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Export Report</SectionLabel>
        <ReportGenerator />
      </div>

      <p className="text-center text-xs text-gray-400">
        Insights are generated from your lead, tour, and activity data. Connect Supabase to unlock live analysis.
      </p>
    </div>
  );
}
