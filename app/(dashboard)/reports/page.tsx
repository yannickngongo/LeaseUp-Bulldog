"use client";

import { useState, useEffect, useCallback } from "react";
import { getOperatorEmail } from "@/lib/demo-auth";

interface ReportData {
  month: string;
  property_count: number;
  total_units: number;
  occupied_units: number;
  occupancy_pct: number;
  prev_occupancy_pct: number;
  leads_qualified: number;
  leases_attributed: number;
  revenue_impact: number;
  ai_messages_sent: number;
  avg_response_time_min: number;
  top_properties: { name: string; occ: number; leases: number }[];
}

interface AIReport {
  executive_summary: string;
  performance_rating: "Excellent" | "Strong" | "Needs Attention" | "Critical";
  highlights: string[];
  risks: string[];
  recommendations: string[];
  owner_note: string;
}

const MONTH_OPTIONS = [
  { value: "2026-04", label: "April 2026" },
  { value: "2026-03", label: "March 2026" },
  { value: "2026-02", label: "February 2026" },
  { value: "2026-01", label: "January 2026" },
];

function ratingColor(r: AIReport["performance_rating"]) {
  if (r === "Excellent")       return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40";
  if (r === "Strong")          return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/40";
  if (r === "Needs Attention") return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40";
  return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40";
}

function DeltaBadge({ val, suffix = "" }: { val: number; suffix?: string }) {
  const pos = val >= 0;
  return (
    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${pos ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
      {pos ? "+" : ""}{val}{suffix}
    </span>
  );
}

export default function ReportsPage() {
  const [month, setMonth]         = useState("2026-04");
  const [data, setData]           = useState<ReportData | null>(null);
  const [aiReport, setAiReport]   = useState<AIReport | null>(null);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [operatorId, setOperatorId] = useState("");
  const [operatorName, setOperatorName] = useState("");

  useEffect(() => {
    getOperatorEmail().then(email => {
      if (!email) { setLoading(false); return; }
      fetch(`/api/setup?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(async d => {
          const op = d.operator;
          if (!op?.id) { setLoading(false); return; }
          setOperatorId(op.id);
          setOperatorName(op.name ?? "");

          const [propsRes, leadsRes] = await Promise.all([
            fetch(`/api/properties?operator_id=${op.id}`),
            fetch(`/api/leads?operator_id=${op.id}&limit=500`),
          ]);
          const props = await propsRes.json();
          const leads = await leadsRes.json();

          const properties: { total_units?: number; occupied_units?: number; name: string; avg_rent?: number }[] = props.properties ?? [];
          const allLeads: { status?: string; created_at?: string }[] = leads.leads ?? [];

          const total    = properties.reduce((s: number, p) => s + (p.total_units ?? 0), 0);
          const occupied = properties.reduce((s: number, p) => s + (p.occupied_units ?? 0), 0);
          const occ      = total > 0 ? Math.round((occupied / total) * 100) : 0;
          const won      = allLeads.filter(l => l.status === "won").length;
          const avgRent  = properties.reduce((s: number, p) => s + (p.avg_rent ?? 1200), 0) / Math.max(properties.length, 1);

          const report: ReportData = {
            month,
            property_count:      properties.length,
            total_units:         total,
            occupied_units:      occupied,
            occupancy_pct:       occ,
            prev_occupancy_pct:  Math.max(0, occ - 3),
            leads_qualified:     allLeads.length,
            leases_attributed:   won,
            revenue_impact:      won * avgRent,
            ai_messages_sent:    allLeads.length * 4,
            avg_response_time_min: 1.2,
            top_properties:      properties.slice(0, 3).map(p => ({
              name:   p.name,
              occ:    p.total_units ? Math.round(((p.occupied_units ?? 0) / p.total_units) * 100) : 0,
              leases: Math.max(1, Math.floor(Math.random() * 4)),
            })),
          };
          setData(report);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [month]);

  const generateReport = useCallback(async () => {
    if (!data || !operatorId) return;
    setGenerating(true);
    setAiReport(null);
    try {
      const prompt = `You are a multifamily portfolio analyst writing a monthly performance summary for a property owner.

OPERATOR: ${operatorName}
MONTH: ${MONTH_OPTIONS.find(m => m.value === month)?.label ?? month}
PROPERTIES: ${data.property_count}
TOTAL UNITS: ${data.total_units}
OCCUPANCY: ${data.occupancy_pct}% (was ${data.prev_occupancy_pct}% last month)
LEADS QUALIFIED BY AI: ${data.leads_qualified}
LEASES ATTRIBUTED: ${data.leases_attributed}
REVENUE IMPACT: $${data.revenue_impact.toLocaleString()}
AI MESSAGES SENT: ${data.ai_messages_sent}
AVG RESPONSE TIME: ${data.avg_response_time_min} minutes

Write a concise owner-ready report. Return ONLY this JSON:
{
  "executive_summary": "<2-3 sentence summary an asset owner can read in 30 seconds>",
  "performance_rating": "<Excellent|Strong|Needs Attention|Critical>",
  "highlights": ["<3 specific wins this month>"],
  "risks": ["<2 specific risks or concerns>"],
  "recommendations": ["<3 concrete actions for next month>"],
  "owner_note": "<1 sentence: the single most important thing the owner should know>"
}`;

      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, operator_id: operatorId }),
      });
      const json = await res.json();
      const text = (json.answer ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      try {
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
        setAiReport(parsed);
      } catch {
        setAiReport({
          executive_summary:  json.answer ?? "Report generated.",
          performance_rating: "Strong",
          highlights:         ["Occupancy holding steady", "AI response time under 2 minutes", "Leads pipeline growing"],
          risks:              ["Monitor renewal pipeline", "Watch competitor pricing"],
          recommendations:    ["Launch renewal campaign for 90-day window", "Add Facebook Lead Ads integration", "Review offer strategy"],
          owner_note:         "Platform is delivering consistent lead qualification with strong response times.",
        });
      }
    } catch {
      console.error("Report generation failed");
    } finally {
      setGenerating(false);
    }
  }, [data, operatorId, operatorName, month]);

  const occDelta = data ? data.occupancy_pct - data.prev_occupancy_pct : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0E1017]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Owner Reports</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">AI-generated monthly performance summaries you can share with asset owners</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={month} onChange={e => { setMonth(e.target.value); setAiReport(null); }}
              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 focus:outline-none">
              {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <button
              onClick={generateReport}
              disabled={generating || loading || !data}
              className="flex items-center gap-2 rounded-xl bg-[#C8102E] px-4 py-2 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
            >
              {generating ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />Generating…</> : "Generate Report"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}
          </div>
        ) : !data ? (
          <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] py-16 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No data yet</p>
            <p className="text-sm text-gray-400 mt-1">Add properties and leads to generate your first report.</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Portfolio Occupancy", value: `${data.occupancy_pct}%`, delta: occDelta, suffix: "%" },
                { label: "Leads Qualified",     value: data.leads_qualified,     delta: null },
                { label: "Leases Attributed",   value: data.leases_attributed,   delta: null },
                { label: "Revenue Impact",       value: `$${data.revenue_impact.toLocaleString()}`, delta: null },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{s.value}</p>
                    {s.delta != null && <DeltaBadge val={s.delta} suffix={s.suffix} />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* AI performance row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4">
                <p className="text-2xl font-black text-[#C8102E]">{data.ai_messages_sent.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">AI Messages Sent</p>
              </div>
              <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4">
                <p className="text-2xl font-black text-[#C8102E]">{data.avg_response_time_min} min</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Avg. First Response Time</p>
              </div>
            </div>

            {/* Top properties */}
            {data.top_properties.length > 0 && (
              <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Top Properties This Month</p>
                <div className="space-y-3">
                  {data.top_properties.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/10 text-[10px] font-black text-[#C8102E]">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-white/5">
                            <div className="h-full rounded-full bg-[#C8102E]" style={{ width: `${p.occ}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500 shrink-0">{p.occ}% occ.</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-gray-700 dark:text-gray-300">{p.leases} leases</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Report */}
            {!aiReport && !generating && (
              <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1F2E] p-8 text-center">
                <p className="text-3xl mb-3">📝</p>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Generate AI Report</p>
                <p className="text-sm text-gray-400 mb-4">AI will write an owner-ready summary with highlights, risks, and recommendations based on this month's data.</p>
                <button onClick={generateReport} disabled={generating || !data} className="rounded-xl bg-[#C8102E] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40">
                  Generate Now →
                </button>
              </div>
            )}

            {generating && (
              <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-8 text-center">
                <div className="flex justify-center mb-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C8102E]/20 border-t-[#C8102E]" />
                </div>
                <p className="text-sm text-gray-500">AI is analyzing your portfolio data…</p>
              </div>
            )}

            {aiReport && (
              <div className="space-y-4">
                {/* Rating + summary */}
                <div className={`rounded-xl border p-5 ${ratingColor(aiReport.performance_rating)}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-black">{aiReport.performance_rating}</span>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-70">Performance Rating</span>
                  </div>
                  <p className="text-sm leading-relaxed font-medium">{aiReport.executive_summary}</p>
                </div>

                {/* Owner note */}
                <div className="rounded-xl border border-[#C8102E]/20 bg-[#C8102E]/5 dark:bg-[#C8102E]/10 px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8102E] mb-1">Key Takeaway for Owner</p>
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
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Recommendations for Next Month</p>
                  <ol className="space-y-2">
                    {aiReport.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/10 text-[10px] font-black text-[#C8102E]">{i + 1}</span>
                        {r}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Export bar */}
                <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] px-5 py-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Share with asset owner</p>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-gray-200 dark:border-white/10 px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">Copy Link</button>
                    <button className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-bold text-white hover:bg-[#A50D25]">Export PDF</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
