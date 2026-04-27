"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getOperatorEmail, authFetch } from "@/lib/demo-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawLead {
  id: string;
  status: string;
  property_id: string;
  created_at: string;
}

interface RawProperty {
  id: string;
  name: string;
  city: string;
  state: string;
  total_units: number;
  occupied_units: number;
  avg_rent?: number;
}

interface PropertyReport {
  id: string;
  name: string;
  city: string;
  state: string;
  total_units: number;
  occupied_units: number;
  occ_pct: number;
  vacancies: number;
  leads: number;
  active_leads: number;
  leases: number;
}

interface AIReport {
  executive_summary: string;
  performance_rating: string;
  highlights: string[];
  risks: string[];
  recommendations: string[];
  owner_note: string;
}

// ─── Period helpers ───────────────────────────────────────────────────────────

interface PeriodRange { start: Date; end: Date; label: string; }

const PERIOD_OPTIONS = [
  { value: "7d",         label: "Last 7 days" },
  { value: "30d",        label: "Last 30 days" },
  { value: "90d",        label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "q1_2026",   label: "Q1 2026 (Jan – Mar)" },
  { value: "q2_2026",   label: "Q2 2026 (Apr – Jun)" },
  { value: "ytd",        label: "Year to date" },
  { value: "custom",     label: "Custom range" },
];

function getPeriodRange(value: string, customStart?: string, customEnd?: string): PeriodRange {
  const now = new Date();
  const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

  if (value === "custom" && customStart && customEnd) {
    const s = new Date(customStart);
    const e = eod(new Date(customEnd));
    return { start: s, end: e, label: `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` };
  }
  const daysAgo = (n: number) => { const d = eod(now); d.setDate(d.getDate() - n); return d; };
  switch (value) {
    case "7d":  return { start: daysAgo(7),  end: eod(now), label: "Last 7 days" };
    case "90d": return { start: daysAgo(90), end: eod(now), label: "Last 90 days" };
    case "this_month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s, end: eod(now), label: now.toLocaleString("en-US", { month: "long", year: "numeric" }) };
    }
    case "last_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = eod(new Date(now.getFullYear(), now.getMonth(), 0));
      return { start: s, end: e, label: s.toLocaleString("en-US", { month: "long", year: "numeric" }) };
    }
    case "q1_2026": return { start: new Date("2026-01-01"), end: new Date("2026-03-31T23:59:59"), label: "Q1 2026 (Jan – Mar)" };
    case "q2_2026": return { start: new Date("2026-04-01"), end: new Date("2026-06-30T23:59:59"), label: "Q2 2026 (Apr – Jun)" };
    case "ytd": return { start: new Date(now.getFullYear(), 0, 1), end: eod(now), label: `Year to Date ${now.getFullYear()}` };
    default:    return { start: daysAgo(30), end: eod(now), label: "Last 30 days" };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ratingColor(r: string) {
  if (r === "Excellent")       return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40";
  if (r === "Strong")          return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/40";
  if (r === "Steady")          return "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-900/40";
  if (r === "Needs Attention") return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40";
  return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40";
}

function OccBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "#10B981" : pct >= 75 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod]           = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [allLeads, setAllLeads]       = useState<RawLead[]>([]);
  const [allProperties, setAllProperties] = useState<RawProperty[]>([]);
  const [aiReport, setAiReport]       = useState<AIReport | null>(null);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState("");

  // Load all data once on mount
  useEffect(() => {
    getOperatorEmail().then(async email => {
      if (!email) { setLoading(false); return; }
      try {
        // Load operator name
        authFetch(`/api/setup`)
          .then(r => r.json())
          .then(d => setOperatorName(d.operator?.name ?? ""))
          .catch(() => {});

        // Properties use email auth
        const propsJson = await authFetch(`/api/properties`).then(r => r.json());
        const props: RawProperty[] = propsJson.properties ?? [];
        setAllProperties(props);

        if (props.length === 0) { setLoading(false); return; }

        // Leads filtered per property (API doesn't support operator-level filter)
        const leadsResults = await Promise.all(
          props.map(p => fetch(`/api/leads?propertyId=${p.id}`).then(r => r.json()))
        );
        setAllLeads(leadsResults.flatMap(r => (r.leads ?? []) as RawLead[]));
      } catch {
        // silently fail — UI shows empty state
      } finally {
        setLoading(false);
      }
    });
  }, []);

  // Derive report data from raw data + selected period
  const { range, portfolioData, propertyReports } = useMemo(() => {
    const r = getPeriodRange(period, customStart, customEnd);

    const filteredLeads = allLeads.filter(l => {
      const t = new Date(l.created_at);
      return t >= r.start && t <= r.end;
    });

    const total    = allProperties.reduce((s, p) => s + (p.total_units ?? 0), 0);
    const occupied = allProperties.reduce((s, p) => s + (p.occupied_units ?? 0), 0);
    const occ      = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const won      = filteredLeads.filter(l => l.status === "won").length;
    const avgRent  = allProperties.reduce((s, p) => s + (p.avg_rent ?? 1200), 0) / Math.max(allProperties.length, 1);

    const propReports: PropertyReport[] = allProperties.map(p => {
      const pLeads  = filteredLeads.filter(l => l.property_id === p.id);
      const active  = pLeads.filter(l => !["won","lost"].includes(l.status)).length;
      const leases  = pLeads.filter(l => l.status === "won").length;
      const occPct  = p.total_units > 0 ? Math.round((p.occupied_units / p.total_units) * 100) : 0;
      return {
        id: p.id, name: p.name, city: p.city, state: p.state,
        total_units: p.total_units, occupied_units: p.occupied_units,
        occ_pct: occPct, vacancies: p.total_units - p.occupied_units,
        leads: pLeads.length, active_leads: active, leases,
      };
    });

    return {
      range: r,
      propertyReports: propReports,
      portfolioData: {
        total_units:           total,
        occupied_units:        occupied,
        occupancy_pct:         occ,
        leads_qualified:       filteredLeads.length,
        leases_attributed:     won,
        revenue_impact:        won * avgRent,
        ai_messages_sent:      filteredLeads.length * 4,
        property_count:        allProperties.length,
      },
    };
  }, [allLeads, allProperties, period, customStart, customEnd]);

  const generateReport = useCallback(async () => {
    if (!portfolioData || allProperties.length === 0) return;
    setGenerating(true);
    setAiReport(null);
    setGenError(null);
    try {
      const res = await fetch("/api/ai/portfolio-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_name:    operatorName,
          properties:       allProperties.map(p => ({
            name: p.name, city: p.city, state: p.state,
            total_units: p.total_units, occupied_units: p.occupied_units,
          })),
          property_details: propertyReports.map(p => ({
            name: p.name, city: p.city, state: p.state,
            occ_pct: p.occ_pct, vacancies: p.vacancies,
            leads: p.leads, active_leads: p.active_leads, leases: p.leases,
          })),
          totalLeads:       portfolioData.leads_qualified,
          wonLeads:         portfolioData.leases_attributed,
          activeLeads:      portfolioData.leads_qualified - portfolioData.leases_attributed,
          aiReplies:        portfolioData.ai_messages_sent,
          estimatedRevenue: portfolioData.revenue_impact,
          portfolioOccPct:  portfolioData.occupancy_pct,
          totalUnits:       portfolioData.total_units,
          occupiedCount:    portfolioData.occupied_units,
          sources:          [],
          period:           range.label,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setGenError(json.error ?? "Report generation failed. Try again."); return; }
      if (json.ok && json.report) {
        const r = json.report;
        setAiReport({
          executive_summary:  r.headline ?? r.executive_summary ?? "",
          performance_rating: r.performance_rating,
          highlights:         r.highlights ?? [],
          risks:              r.risks ?? [],
          recommendations:    r.recommendations ?? [],
          owner_note:         r.kpi_callout ?? r.owner_note ?? r.outlook ?? "",
        });
      } else {
        setGenError("No report data returned. Please try again.");
      }
    } catch (e) {
      setGenError("Network error — check your connection and try again.");
      console.error("Report generation error:", e);
    } finally {
      setGenerating(false);
    }
  }, [portfolioData, allProperties, propertyReports, operatorName, range]);

  const exportPdf = useCallback(() => {
    if (!portfolioData || !aiReport) return;

    const propRows = propertyReports.map(p => `
      <tr>
        <td>${p.name}<br/><span style="color:#888;font-size:10px">${p.city}, ${p.state}</span></td>
        <td>${p.occupied_units}/${p.total_units}</td>
        <td style="color:${p.occ_pct >= 90 ? '#065F46' : p.occ_pct >= 75 ? '#B45309' : '#991B1B'};font-weight:700">${p.occ_pct}%</td>
        <td>${p.vacancies}</td>
        <td>${p.leads}</td>
        <td>${p.leases}</td>
      </tr>`).join("");

    const ratingClass = aiReport.performance_rating === "Needs Attention" ? "warn"
      : (aiReport.performance_rating === "Critical" || aiReport.performance_rating === "Steady") ? "steady" : "";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>LeaseUp Bulldog — ${range.label} Portfolio Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #C8102E; padding-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }
  .brand-lease { color: #111; }
  .brand-bulldog { color: #C8102E; }
  .brand-tagline { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #999; margin-top: 4px; }
  .period { font-size: 12px; color: #666; margin-top: 4px; }
  .generated { font-size: 10px; color: #999; text-align: right; }
  h2 { font-size: 14px; font-weight: 700; margin: 24px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; color: #111; }
  .badge { display: inline-block; padding: 3px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; background: #ecfdf5; color: #065F46; margin-bottom: 14px; }
  .badge.warn  { background: #fffbeb; color: #b45309; }
  .badge.steady { background: #eff6ff; color: #1d4ed8; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
  .kpi-val { font-size: 20px; font-weight: 900; }
  .kpi-lbl { font-size: 10px; color: #666; margin-top: 2px; }
  .summary-box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 14px; font-size: 13px; line-height: 1.65; color: #1f2937; }
  .note { border-left: 3px solid #C8102E; padding: 10px 14px; margin-bottom: 18px; background: #fff8f8; }
  .note-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #C8102E; margin-bottom: 3px; }
  .note-text { font-size: 13px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  th { background: #f9fafb; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
  td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .section { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
  .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 8px; }
  ul, ol { padding-left: 0; list-style: none; }
  li { font-size: 12px; color: #374151; padding: 3px 0; display: flex; gap: 6px; align-items: flex-start; }
  ol { counter-reset: item; }
  ol li { counter-increment: item; }
  ol li::before { content: counter(item); display: inline-flex; width: 16px; height: 16px; border-radius: 50%; background: #fee2e2; color: #C8102E; font-size: 9px; font-weight: 900; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .footer { margin-top: 32px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; }
  @media print { body { padding: 20px; } @page { margin: 1.5cm; size: A4; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand"><span class="brand-lease">LeaseUp</span><span class="brand-bulldog">Bulldog</span></div>
    <div class="brand-tagline">Occupancy Intelligence Platform</div>
    <div class="period">Portfolio Report · ${range.label}</div>
  </div>
  <div class="generated">Generated by LeaseUp Bulldog<br/>${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
</div>

<div class="badge ${ratingClass}">${aiReport.performance_rating}</div>

<div class="kpi-grid">
  <div class="kpi"><div class="kpi-val">${portfolioData.occupancy_pct}%</div><div class="kpi-lbl">Portfolio Occupancy</div></div>
  <div class="kpi"><div class="kpi-val">${portfolioData.leads_qualified}</div><div class="kpi-lbl">Leads This Period</div></div>
  <div class="kpi"><div class="kpi-val">${portfolioData.leases_attributed}</div><div class="kpi-lbl">Leases Attributed</div></div>
  <div class="kpi"><div class="kpi-val">$${portfolioData.revenue_impact.toLocaleString()}</div><div class="kpi-lbl">Revenue Impact</div></div>
</div>

<h2>Executive Summary</h2>
<div class="summary-box">${aiReport.executive_summary}</div>
<div class="note">
  <div class="note-label">Key Takeaway</div>
  <div class="note-text">${aiReport.owner_note}</div>
</div>

<h2>Property-by-Property Breakdown</h2>
<table>
  <thead><tr>
    <th>Property</th><th>Units</th><th>Occupancy</th><th>Vacancies</th><th>Leads</th><th>Leases</th>
  </tr></thead>
  <tbody>${propRows}</tbody>
</table>

<h2>Performance Detail</h2>
<div class="two-col">
  <div class="section">
    <div class="section-title">Highlights</div>
    <ul>${aiReport.highlights.map(h => `<li><span style="color:#10b981;font-weight:700">✓</span>${h}</li>`).join("")}</ul>
  </div>
  <div class="section">
    <div class="section-title">Risks to Watch</div>
    <ul>${aiReport.risks.map(r => `<li><span style="color:#f59e0b;font-weight:700">⚠</span>${r}</li>`).join("")}</ul>
  </div>
</div>

<div class="section">
  <div class="section-title">Recommendations</div>
  <ol>${aiReport.recommendations.map(r => `<li>${r}</li>`).join("")}</ol>
</div>

<div class="footer">
  <span>LeaseUp Bulldog · ${portfolioData.property_count} properties · ${portfolioData.total_units} units · ${portfolioData.ai_messages_sent.toLocaleString()} AI messages sent</span>
  <span>Confidential — for internal use</span>
</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups to download the PDF."); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }, [portfolioData, aiReport, propertyReports, range]);

  const hasData = allProperties.length > 0;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0E1017]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Owner Reports</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Portfolio performance reports you can share with asset owners</p>
          </div>

          {/* Period selector + generate */}
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <select value={period} onChange={e => { setPeriod(e.target.value); setAiReport(null); setGenError(null); }}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 focus:outline-none">
                {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button onClick={generateReport} disabled={generating || loading || !hasData}
                className="flex items-center gap-2 rounded-xl bg-[#C8102E] px-4 py-2 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
                {generating
                  ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />Generating…</>
                  : "Generate Report"}
              </button>
            </div>
            {/* Custom date inputs */}
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <input type="date" value={customStart} onChange={e => { setCustomStart(e.target.value); setAiReport(null); }}
                  className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setAiReport(null); }}
                  className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none" />
              </div>
            )}
            {!loading && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {range.label} · {portfolioData.leads_qualified} lead{portfolioData.leads_qualified !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}
          </div>
        ) : !hasData ? (
          <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] py-16 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No data yet</p>
            <p className="text-sm text-gray-400 mt-1">Add properties and leads to generate your first report.</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Portfolio KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Portfolio Occupancy", value: `${portfolioData.occupancy_pct}%` },
                { label: "Leads This Period",   value: portfolioData.leads_qualified },
                { label: "Leases Attributed",   value: portfolioData.leases_attributed },
                { label: "Revenue Impact",       value: `$${portfolioData.revenue_impact.toLocaleString()}` },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4">
                  <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{s.value}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* AI messages stat */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4">
                <p className="text-2xl font-black text-[#C8102E]">{portfolioData.ai_messages_sent.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">AI Messages Sent</p>
              </div>
              <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4">
                <p className="text-2xl font-black text-[#C8102E]">
                  {portfolioData.total_units - portfolioData.occupied_units}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Vacancies</p>
              </div>
            </div>

            {/* Per-property breakdown */}
            <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] overflow-hidden">
              <div className="border-b border-gray-50 dark:border-white/5 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Property-by-Property Breakdown</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{range.label}</p>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {propertyReports.map(p => (
                  <div key={p.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                        <p className="text-[11px] text-gray-400">{p.city}, {p.state}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        p.vacancies === 0     ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" :
                        p.vacancies <= 2      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" :
                                                "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      }`}>
                        {p.vacancies === 0 ? "Full" : `${p.vacancies} vacant`}
                      </span>
                    </div>
                    <OccBar pct={p.occ_pct} />
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>{p.occupied_units}/{p.total_units} units</span>
                      <span className="h-3 w-px bg-gray-200 dark:bg-white/10" />
                      <span>{p.leads} lead{p.leads !== 1 ? "s" : ""} this period</span>
                      <span className="h-3 w-px bg-gray-200 dark:bg-white/10" />
                      <span className={p.leases > 0 ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>{p.leases} lease{p.leases !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Report prompt */}
            {!aiReport && !generating && !genError && (
              <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1F2E] p-8 text-center">
                <p className="text-3xl mb-3">📝</p>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Generate AI Report</p>
                <p className="text-sm text-gray-400 mb-4">AI writes an owner-ready summary — portfolio overview and per-property analysis for {range.label}.</p>
                <button onClick={generateReport} disabled={generating} className="rounded-xl bg-[#C8102E] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40">
                  Generate Now →
                </button>
              </div>
            )}

            {generating && (
              <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-8 text-center">
                <div className="flex justify-center mb-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C8102E]/20 border-t-[#C8102E]" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Generating report…</p>
                <p className="mt-1 text-xs text-gray-400">AI is analyzing your portfolio — this takes 10–20 seconds</p>
              </div>
            )}

            {genError && !generating && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-5 py-4">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">{genError}</p>
                <button onClick={generateReport} className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 underline hover:no-underline">Try again</button>
              </div>
            )}

            {aiReport && (
              <div className="space-y-4">
                {/* Rating + summary */}
                <div className={`rounded-xl border p-5 ${ratingColor(aiReport.performance_rating)}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-black">{aiReport.performance_rating}</span>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-70">Performance Rating · {range.label}</span>
                  </div>
                  <p className="text-sm leading-relaxed font-medium">{aiReport.executive_summary}</p>
                </div>

                {/* Key takeaway */}
                <div className="rounded-xl border border-[#C8102E]/20 bg-[#C8102E]/5 dark:bg-[#C8102E]/10 px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8102E] mb-1">Key Takeaway</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{aiReport.owner_note}</p>
                </div>

                {/* Highlights + Risks */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Highlights</p>
                    <ul className="space-y-2">
                      {aiReport.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-green-500 shrink-0 mt-0.5">✓</span>{h}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Risks to Watch</p>
                    <ul className="space-y-2">
                      {aiReport.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-red-400 shrink-0 mt-0.5">⚠</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Recommendations</p>
                  <ol className="space-y-2">
                    {aiReport.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/10 text-[10px] font-black text-[#C8102E]">{i + 1}</span>
                        {r}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Export */}
                <div className="flex flex-col gap-3 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ready to share</p>
                    <p className="text-xs text-gray-400 mt-0.5">PDF includes portfolio + property-by-property breakdown</p>
                  </div>
                  <button onClick={exportPdf}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25]">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path d="M8 1a.75.75 0 01.75.75v5.69l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 011.06-1.06l1.72 1.72V1.75A.75.75 0 018 1zm-4 9a.75.75 0 000 1.5h8a.75.75 0 000-1.5H4z" />
                    </svg>
                    Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
