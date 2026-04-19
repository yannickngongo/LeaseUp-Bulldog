import Link from "next/link";
import { StatusBadge } from "@/components/ui/Badge";
import type { LeadStatus } from "@/lib/types";

// ─── Mock data ────────────────────────────────────────────────────────────────

const ATTENTION_ITEMS = [
  { id: "1", name: "Jordan Ellis",   property: "The Monroe",       issue: "New lead from Zillow — AI reply pending",      age: "47m ago",  urgency: "high"   as const, status: "new"            as LeadStatus },
  { id: "2", name: "Maya Thompson",  property: "The Monroe",       issue: "No reply in 4 days — follow-up overdue",       age: "4d ago",   urgency: "high"   as const, status: "contacted"      as LeadStatus },
  { id: "3", name: "Carlos Reyes",   property: "Parkview Commons", issue: "Tour tomorrow at 10:00 AM — unconfirmed",      age: "Tomorrow", urgency: "medium" as const, status: "tour_scheduled" as LeadStatus },
  { id: "4", name: "Aisha Patel",    property: "Parkview Commons", issue: "App started 6 days ago — step 2 of 4 stalled", age: "6d ago",   urgency: "medium" as const, status: "applied"        as LeadStatus },
  { id: "5", name: "Derek Nguyen",   property: "The Monroe",       issue: "3 AI follow-ups sent — no engagement",         age: "11d ago",  urgency: "low"    as const, status: "engaged"        as LeadStatus },
];

const PIPELINE_STAGES = [
  { label: "New",            count: 12, color: "bg-indigo-400",  pct: 100 },
  { label: "Contacted",      count:  8, color: "bg-sky-400",     pct: 67  },
  { label: "Engaged",        count:  6, color: "bg-violet-400",  pct: 50  },
  { label: "Tour Scheduled", count:  4, color: "bg-amber-400",   pct: 33  },
  { label: "Applied",        count:  2, color: "bg-orange-400",  pct: 17  },
];

const ACTIVITY = [
  { id: "a1", time: "12m ago", actor: "AI",     text: "First reply sent to Jordan Ellis in 58s",       dot: "bg-violet-400" },
  { id: "a2", time: "34m ago", actor: "Lead",   text: "Carlos Reyes confirmed tour: Apr 21 · 10 AM",   dot: "bg-blue-400" },
  { id: "a3", time: "2h ago",  actor: "Lead",   text: "Maya Thompson: \"Is the 2BR still available?\"", dot: "bg-blue-400" },
  { id: "a4", time: "3h ago",  actor: "System", text: "Inbound lead: Sofia Ruiz via Zillow — The Monroe", dot: "bg-gray-300" },
  { id: "a5", time: "5h ago",  actor: "AI",     text: "Day 3 follow-up sent to 4 leads across 2 properties", dot: "bg-violet-400" },
];

const DONUT_SEGMENTS = [
  { label: "Creekside at Summerlin", units: 91,  color: "#22C55E" },
  { label: "Sonoran Ridge",          units: 109, color: "#06B6D4" },
  { label: "The Monroe",             units: 43,  color: "#6366F1" },
  { label: "Parkview Commons",       units: 63,  color: "#8B5CF6" },
  { label: "Desert Bloom",           units: 37,  color: "#F59E0B" },
  { label: "Vista on 5th",           units: 41,  color: "#F97316" },
  { label: "Vacant",                 units: 70,  color: "#E5E7EB" },
];

const URGENCY_DOT: Record<"high" | "medium" | "low", string> = {
  high:   "bg-red-400",
  medium: "bg-amber-400",
  low:    "bg-gray-300",
};

const URGENCY_AGE_STYLE: Record<"high" | "medium" | "low", string> = {
  high:   "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-700",
  low:    "bg-gray-100 text-gray-500",
};

const ACTOR_LABEL: Record<string, string> = {
  AI:     "bg-violet-50 text-violet-700",
  Lead:   "bg-blue-50 text-blue-700",
  System: "bg-gray-100 text-gray-500",
};

// ─── DonutChart ───────────────────────────────────────────────────────────────

function DonutChart({ segments }: { segments: typeof DONUT_SEGMENTS }) {
  const cx = 50, cy = 50, r = 36, sw = 11;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.units, 0);
  const gap = 1.8;
  let offset = 0;

  const draws = segments.map((seg) => {
    const len = (seg.units / total) * circ - gap;
    const dash = offset;
    offset += (seg.units / total) * circ;
    return { ...seg, len, dash };
  });

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <g transform="rotate(-90 50 50)">
        {draws.map((s, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={sw}
            strokeDasharray={`${Math.max(s.len, 0)} ${circ}`}
            strokeDashoffset={-s.dash}
            strokeLinecap="butt"
          />
        ))}
      </g>
      {/* Center text */}
      <text x="50" y="46" textAnchor="middle" className="text-[14px] font-bold fill-gray-900" style={{ fontSize: 14, fontWeight: 700, fill: "#111827" }}>88%</text>
      <text x="50" y="58" textAnchor="middle" style={{ fontSize: 7, fill: "#9CA3AF" }}>occupied</text>
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const totalUnits = DONUT_SEGMENTS.reduce((a, s) => a + s.units, 0);

  return (
    <div className="space-y-5 p-6">

      {/* ── Greeting ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Good morning, Marcus.</h1>
        <p className="mt-0.5 text-sm text-gray-400">{today} · 6 properties · 24 active leads</p>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Portfolio Occupancy",
            value: "88.3%",
            sub: "106 / 120 units filled",
            trend: "+1.4pts this month",
            trendUp: true,
            accent: "bg-green-50",
            accentText: "text-green-600",
          },
          {
            label: "Active Leads",
            value: "24",
            sub: "across 6 properties",
            trend: "+3 vs last week",
            trendUp: true,
            accent: "bg-indigo-50",
            accentText: "text-indigo-600",
          },
          {
            label: "Tours This Week",
            value: "7",
            sub: "3 confirmed · 2 pending",
            trend: "+2 from last week",
            trendUp: true,
            accent: "bg-amber-50",
            accentText: "text-amber-600",
          },
          {
            label: "Avg. Response Time",
            value: "1m 08s",
            sub: "AI-powered · all properties",
            trend: "↓ 63% vs last month",
            trendUp: true,
            accent: "bg-violet-50",
            accentText: "text-violet-600",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
          >
            <p className="text-xs font-medium text-gray-400">{k.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{k.value}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">{k.sub}</p>
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${k.accent} ${k.accentText}`}>
                {k.trendUp ? "↑" : "↓"} {k.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_260px_280px]">

        {/* Needs Attention */}
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Needs Attention</h3>
              <p className="mt-0.5 text-xs text-gray-400">Leads requiring action now</p>
            </div>
            <Link href="/leads" className="text-xs font-medium text-[#C8102E] hover:underline">
              View all →
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {ATTENTION_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={`/leads`}
                className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-gray-50/60"
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[item.urgency]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{item.issue}</p>
                  <p className="mt-0.5 text-[10px] text-gray-400">{item.property}</p>
                </div>
                <span className={`shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${URGENCY_AGE_STYLE[item.urgency]}`}>
                  {item.age}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Portfolio Occupancy Ring */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Portfolio Occupancy</h3>
          </div>

          <div className="mx-auto h-[140px] w-[140px]">
            <DonutChart segments={DONUT_SEGMENTS} />
          </div>

          <div className="mt-4 space-y-1.5">
            {DONUT_SEGMENTS.filter((s) => s.label !== "Vacant").slice(0, 4).map((seg) => (
              <div key={seg.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-[11px] text-gray-500 truncate max-w-[110px]">{seg.label}</span>
                </div>
                <span className="text-[11px] font-semibold text-gray-700">{seg.units}</span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-200" />
                <span className="text-[11px] text-gray-400">Vacant</span>
              </div>
              <span className="text-[11px] font-semibold text-gray-400">
                {DONUT_SEGMENTS.find((s) => s.label === "Vacant")?.units}
              </span>
            </div>
            <p className="pt-1 text-[10px] text-gray-300">{totalUnits} total units across 6 properties</p>
          </div>
        </div>

        {/* Pipeline + Activity */}
        <div className="flex flex-col gap-4">
          {/* Pipeline */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Pipeline</h3>
              <Link href="/leads" className="text-[11px] font-medium text-[#C8102E] hover:underline">
                Open →
              </Link>
            </div>
            <div className="space-y-2.5">
              {PIPELINE_STAGES.map((s) => (
                <div key={s.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">{s.label}</span>
                    <span className="text-[11px] font-bold tabular-nums text-gray-900">{s.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="flex-1 rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Recent Activity</h3>
            <div className="space-y-3">
              {ACTIVITY.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed text-gray-700">{item.text}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className={`rounded px-1 py-0.5 text-[9px] font-semibold ${ACTOR_LABEL[item.actor] ?? "bg-gray-100 text-gray-500"}`}>
                        {item.actor}
                      </span>
                      <span className="text-[10px] text-gray-400">{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
