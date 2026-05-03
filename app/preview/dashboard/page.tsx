import Link from "next/link";

// PREVIEW: Dashboard mockup in Denji-style layout, LUB color scheme.
// Dark + red primary, violet/amber accents (already used in current LUB design for status badges).
// Static visual mockup only. Does not connect to real data.

export const metadata = { title: "LeaseUp Bulldog — Dashboard Preview" };

// LUB brand tokens (matches current leaseupbulldog.com)
const BG = "#08080F";          // page bg
const PANEL = "#10101A";       // card bg
const PANEL_2 = "#16161F";     // raised card bg
const BORDER = "#1E1E2E";      // borders / dividers
const TEXT = "#FFFFFF";
const MUTED = "#9CA3AF";       // gray-400
const FAINT = "#4B5563";       // gray-600

// Accent palette (all already used in current LUB design):
const RED_BRAND = "#C8102E";   // primary brand red (wordmark + primary CTAs)
const RED_HOVER = "#A50D25";   // darker red
const RED_LIGHT = "#F87171";   // red-300 (accent text on dark)
const VIOLET = "#A78BFA";      // violet-400 (used for "Engaged" status badges)
const AMBER = "#F59E0B";       // amber-500 (used for "Tour Scheduled" badges)
const SLATE = "#64748B";       // slate-500 (used for muted neutral)

// KPI/icon roles — mapped to LUB palette so the dashboard reads as one cohesive design
const BLUE = VIOLET;   // (alias kept so existing template code below doesn't have to change)
const PURPLE = VIOLET;
const ORANGE = AMBER;
const RED = RED_BRAND;
const GREEN = SLATE;

export default function DashboardPreview() {
  return (
    <div style={{ background: BG, color: TEXT }} className="min-h-screen">

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`body { font-family: 'Inter', system-ui, sans-serif; }`}</style>

      <div className="flex min-h-screen">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="sticky top-0 hidden h-screen w-[260px] flex-shrink-0 flex-col border-r p-5 lg:flex" style={{ borderColor: BORDER, background: PANEL }}>

          {/* Workspace selector */}
          <div className="mb-8 flex items-center justify-between rounded-xl border p-3" style={{ borderColor: BORDER, background: PANEL_2 }}>
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})` }}
              >
                <span className="text-sm font-black text-white">LB</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">LeaseUp<span style={{ color: RED_BRAND }}>Bulldog</span></p>
                <p className="text-[10px]" style={{ color: MUTED }}>Workspace · Operator</p>
              </div>
            </div>
            <ChevronVertical />
          </div>

          {/* Main menu */}
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: FAINT }}>Main Menu</p>
          <nav className="flex flex-col gap-1">
            {[
              { icon: <IconGrid />, label: "Dashboard", active: true },
              { icon: <IconChart />, label: "Analytics" },
              { icon: <IconUsers />, label: "Leads", badge: "23" },
              { icon: <IconBuilding />, label: "Properties" },
              { icon: <IconCalendar />, label: "Tours" },
              { icon: <IconChat />, label: "Conversations" },
              { icon: <IconCash />, label: "Billing" },
              { icon: <IconSettings />, label: "Settings" },
            ].map((item) => (
              <button
                key={item.label}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: item.active ? `linear-gradient(90deg, ${RED_BRAND}25, transparent)` : "transparent",
                  color: item.active ? "#FFFFFF" : MUTED,
                  borderLeft: item.active ? `2px solid ${RED_BRAND}` : "2px solid transparent",
                }}
              >
                <span style={{ color: item.active ? RED_BRAND : FAINT }}>{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${RED_BRAND}25`, color: RED_LIGHT }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* User card */}
          <div className="mt-auto flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: BORDER, background: PANEL_2 }}>
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
            >
              YN
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">Yannick Ngongo</p>
              <p className="truncate text-[10px]" style={{ color: MUTED }}>yannick@leaseup...</p>
            </div>
            <ChevronVertical />
          </div>
        </aside>

        {/* ── Main panel ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-x-hidden p-6 lg:p-8">

          {/* Header */}
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="mt-1 text-sm" style={{ color: MUTED }}>Welcome back — here&apos;s what happened overnight.</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden items-center gap-2 rounded-xl border px-4 py-2.5 sm:flex" style={{ borderColor: BORDER, background: PANEL }}>
                <IconSearch />
                <input
                  type="text"
                  placeholder="Search leads, properties..."
                  className="w-48 bg-transparent text-sm outline-none placeholder:text-[#4A5777]"
                  style={{ color: TEXT }}
                  readOnly
                />
                <span className="rounded border px-1.5 py-0.5 text-[10px] font-mono" style={{ borderColor: BORDER, color: FAINT }}>⌘K</span>
              </div>
              {/* Bell */}
              <button className="relative rounded-xl border p-2.5" style={{ borderColor: BORDER, background: PANEL }}>
                <IconBell />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full" style={{ background: RED }} />
              </button>
              {/* User pill */}
              <button className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: BORDER, background: PANEL }}>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
                >
                  YN
                </div>
                <span className="hidden text-sm font-semibold sm:inline">Yannick</span>
                <ChevronDown />
              </button>
            </div>
          </header>

          {/* Tabs row */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: BORDER, background: PANEL }}>
              {[
                { label: "Activity", icon: <IconActivity />, active: true },
                { label: "Conversations", icon: <IconChat /> },
                { label: "Performance", icon: <IconChartBar /> },
              ].map((tab) => (
                <button
                  key={tab.label}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    background: tab.active ? PANEL_2 : "transparent",
                    color: tab.active ? "#FFFFFF" : MUTED,
                    border: tab.active ? `1px solid ${BORDER}` : "1px solid transparent",
                  }}
                >
                  <span style={{ color: tab.active ? BLUE : FAINT }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium" style={{ borderColor: BORDER, background: PANEL, color: TEXT }}>
                <span style={{ color: MUTED }}>Period:</span> 1 May – 31 May, 2026
                <ChevronDown />
              </button>
              <button className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium" style={{ borderColor: BORDER, background: PANEL, color: TEXT }}>
                All Properties
                <ChevronDown />
              </button>
            </div>
          </div>

          {/* KPI tiles */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "New Leads", value: "148", delta: "+12%", up: true, icon: <IconUsers />, gradient: `linear-gradient(135deg, ${VIOLET}, #7C5BE6)` },
              { label: "Tours Booked", value: "31", delta: "+24%", up: true, icon: <IconCalendar />, gradient: `linear-gradient(135deg, ${AMBER}, #D97706)` },
              { label: "Avg Response", value: "0:47s", delta: "−18%", up: true, icon: <IconBolt />, gradient: `linear-gradient(135deg, ${RED_BRAND}, ${RED_HOVER})` },
              { label: "Leases Signed", value: "12", delta: "+8%", up: true, icon: <IconCheck />, gradient: `linear-gradient(135deg, ${RED_LIGHT}, ${RED_BRAND})` },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: PANEL }}>
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg"
                    style={{ background: kpi.gradient, boxShadow: `0 8px 24px ${PURPLE}25` }}
                  >
                    {kpi.icon}
                  </div>
                  <button className="text-xs" style={{ color: MUTED }}>•••</button>
                </div>
                <p className="text-sm" style={{ color: MUTED }}>{kpi.label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-white">{kpi.value}</p>
                <div className="mt-3 flex items-center gap-1.5 text-xs">
                  <span style={{ color: kpi.up ? "#FFFFFF" : RED_LIGHT }}>
                    {kpi.up ? "▲" : "▼"} {kpi.delta}
                  </span>
                  <span style={{ color: MUTED }}>vs last month</span>
                </div>
              </div>
            ))}
          </div>

          {/* Main grid: chart left, contacts right */}
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Chart panel */}
            <div className="lg:col-span-2 space-y-6">

              {/* Heatmap chart */}
              <div className="rounded-2xl border p-6" style={{ borderColor: BORDER, background: PANEL }}>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <p className="text-sm" style={{ color: MUTED }}>Lead volume per property</p>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight text-white">1,284</span>
                      <span className="text-xs" style={{ color: "#FFFFFF" }}>▲ 18%</span>
                    </p>
                  </div>
                  <button className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: BORDER, color: TEXT }}>
                    Monthly <ChevronDown />
                  </button>
                </div>
                <Heatmap />
                <div className="mt-4 flex justify-between text-xs" style={{ color: MUTED }}>
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m) => (<span key={m}>{m}</span>))}
                </div>
              </div>

              {/* Buyers/Properties region (using world map) */}
              <div className="grid gap-6 sm:grid-cols-5 rounded-2xl border p-6" style={{ borderColor: BORDER, background: PANEL }}>
                <div className="sm:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm" style={{ color: MUTED }}>Top markets</p>
                    <button className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px]" style={{ borderColor: BORDER, color: MUTED }}>
                      Last 30d <ChevronDown />
                    </button>
                  </div>
                  <p className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-white">$22,549</span>
                    <span className="text-xs" style={{ color: GREEN }}>▲ 12%</span>
                  </p>
                  <p className="mt-1 text-xs" style={{ color: MUTED }}>Performance fees this month</p>

                  <div className="mt-5 space-y-3">
                    {[
                      { region: "Dallas–Fort Worth", pct: 38, color: RED_BRAND },
                      { region: "Austin", pct: 24, color: VIOLET },
                      { region: "Houston", pct: 22, color: AMBER },
                      { region: "San Antonio", pct: 16, color: SLATE },
                    ].map((r) => (
                      <div key={r.region}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span style={{ color: TEXT }}>{r.region}</span>
                          <span className="font-semibold" style={{ color: r.color }}>{r.pct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: PANEL_2 }}>
                          <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <USMap />
                </div>
              </div>
            </div>

            {/* Right column: leads */}
            <div className="rounded-2xl border p-6" style={{ borderColor: BORDER, background: PANEL }}>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Hot Leads</h3>
                <button className="flex items-center gap-1 text-xs font-semibold" style={{ color: BLUE }}>
                  View All <ChevronRight />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { name: "Jordan Ellis", source: "jordan@email.com", tags: ["Move Aug 11", "1BR · $1,795"], badge: "HOT", initial: "J", grad: `linear-gradient(135deg, ${RED_BRAND}, ${RED_HOVER})`, score: 94 },
                  { name: "Maya Thompson", source: "maya@email.com", tags: ["Move Sep 1", "2BR · $2,400"], badge: "VIP", initial: "M", grad: `linear-gradient(135deg, ${VIOLET}, #7C5BE6)`, score: 88 },
                  { name: "Carlos Reyes", source: "carlos@email.com", tags: ["Move Aug 15", "Studio · $1,400"], badge: "WARM", initial: "C", grad: `linear-gradient(135deg, ${AMBER}, #D97706)`, score: 76 },
                ].map((lead) => (
                  <div key={lead.name} className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PANEL_2 }}>
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ background: lead.grad }}
                        >
                          {lead.initial}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                            {lead.name}
                            <CheckBadge />
                          </p>
                          <p className="truncate text-[11px]" style={{ color: MUTED }}>{lead.source}</p>
                        </div>
                      </div>
                      <span
                        className="flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: lead.badge === "HOT" ? `${RED_BRAND}20` : lead.badge === "VIP" ? `${VIOLET}20` : `${AMBER}20`,
                          color: lead.badge === "HOT" ? RED_LIGHT : lead.badge === "VIP" ? VIOLET : AMBER,
                        }}
                      >
                        {lead.badge}
                      </span>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {lead.tags.map((tag) => (
                        <span key={tag} className="rounded-md border px-2 py-0.5 text-[10px]" style={{ borderColor: BORDER, color: TEXT }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mb-3 flex items-center justify-between text-[11px]" style={{ color: MUTED }}>
                      <span>AI score: <span className="font-bold" style={{ color: TEXT }}>{lead.score}</span></span>
                      <span>Last contact: <span className="font-bold" style={{ color: TEXT }}>2m ago</span></span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white"
                        style={{ background: RED_BRAND }}
                      >
                        <IconMailSm /> Reply
                      </button>
                      <button
                        className="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold text-white"
                        style={{ borderColor: BORDER }}
                      >
                        <IconPhone /> Call
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Heatmap chart (Denji-style colored squares grid)
// ─────────────────────────────────────────────────────────────────────────────
function Heatmap() {
  // 12 columns (months) × 6 rows; each cell colored by value
  // Red gradient using LUB palette: dark border → faint red → brand red → light red → white peak
  const COLORS = [
    "#1E1E2E",  // BORDER (low)
    "#3A1620",
    "#5C1623",
    "#8B1428",
    "#C8102E",  // RED_BRAND
    "#F87171",  // RED_LIGHT
    "#FFFFFF",  // peak
  ];

  // Pre-baked values to look natural
  const data = [
    [3,2,4,5,3,4,5,4,3,2,3,4],
    [2,3,5,4,5,3,4,3,2,3,4,3],
    [4,5,3,5,6,5,4,5,4,3,2,3],
    [3,4,5,4,5,4,3,4,3,4,5,4],
    [5,4,3,4,3,5,4,3,5,4,3,5],
    [4,3,4,3,4,5,3,4,3,2,4,3],
  ];

  return (
    <div className="relative">
      {/* Tooltip */}
      <div
        className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border px-3 py-2 text-xs"
        style={{ left: "42%", top: "5%", borderColor: RED_BRAND, background: PANEL_2, boxShadow: `0 0 24px ${RED_BRAND}40` }}
      >
        <p className="font-bold text-white">$132,000 ARR</p>
        <p style={{ color: MUTED }}>May 2026 · The Standard</p>
        <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r" style={{ borderColor: RED_BRAND, background: PANEL_2 }} />
      </div>

      <div className="space-y-1.5 pt-12">
        {data.map((row, ri) => (
          <div key={ri} className="flex justify-between gap-1.5">
            {row.map((v, ci) => (
              <div
                key={ci}
                className="h-8 flex-1 rounded-md transition-transform hover:scale-110"
                style={{
                  background: COLORS[v],
                  boxShadow: v === 6 ? `0 0 12px #FFFFFF80` : v >= 5 ? `0 0 8px ${COLORS[v]}80` : "none",
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="ml-2 mt-2 flex justify-between text-[10px]" style={{ color: MUTED }}>
        {[60,50,40,30,20,10,0].map((n)=>(<span key={n} style={{ position:"absolute",display:"none" }}>{n}</span>))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// US Map (simplified abstract shape with highlighted markets)
// ─────────────────────────────────────────────────────────────────────────────
function USMap() {
  return (
    <div className="relative h-full min-h-[200px]">
      <svg viewBox="0 0 640 360" className="h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-label="US map with Texas markets highlighted">
        {/* Stylized US continent outline (rough) */}
        <path
          d="M60 140 L100 90 L180 70 L260 60 L340 65 L420 75 L500 85 L560 110 L590 150 L600 200 L580 250 L520 290 L450 300 L380 305 L320 310 L260 305 L200 290 L140 270 L90 230 L60 190 Z"
          fill={PANEL_2}
          stroke={BORDER}
          strokeWidth="1.5"
        />
        {/* Texas region (rough) */}
        <path
          d="M260 220 L300 210 L350 215 L380 240 L375 280 L340 295 L300 290 L270 270 Z"
          fill={`${RED_BRAND}40`}
          stroke={RED_BRAND}
          strokeWidth="1.5"
        />

        {/* City dots */}
        {[
          { x: 320, y: 245, label: "Dallas–Fort Worth", color: RED_BRAND, r: 12, pulse: true },
          { x: 330, y: 280, label: "Austin", color: VIOLET, r: 9 },
          { x: 350, y: 285, label: "Houston", color: AMBER, r: 9 },
          { x: 305, y: 285, label: "San Antonio", color: SLATE, r: 7 },
        ].map((c, i) => (
          <g key={i}>
            {c.pulse && (
              <circle cx={c.x} cy={c.y} r={c.r + 6} fill={c.color} opacity="0.2">
                <animate attributeName="r" values={`${c.r};${c.r+12};${c.r}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={c.x} cy={c.y} r={c.r} fill={c.color} opacity="0.85" />
            <circle cx={c.x} cy={c.y} r="2" fill="#FFFFFF" />
            <text x={c.x + c.r + 4} y={c.y + 3} fontSize="9" fill={TEXT} fontWeight="600">
              {c.label}
            </text>
          </g>
        ))}

        {/* Subtle dot grid overlay (suggests other states) */}
        {Array.from({ length: 80 }).map((_, i) => {
          const x = 80 + (i % 16) * 35;
          const y = 100 + Math.floor(i / 16) * 35;
          return <circle key={i} cx={x} cy={y} r="0.8" fill={FAINT} opacity="0.5" />;
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────
function IconGrid() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>); }
function IconChart() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>); }
function IconChartBar() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>); }
function IconUsers() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>); }
function IconBuilding() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="15" y1="6" x2="15.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/><line x1="9" y1="14" x2="9.01" y2="14"/><line x1="15" y1="14" x2="15.01" y2="14"/></svg>); }
function IconCalendar() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>); }
function IconChat() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>); }
function IconCash() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>); }
function IconSettings() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>); }
function IconBell() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>); }
function IconSearch() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>); }
function IconActivity() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>); }
function IconBolt() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>); }
function IconCheck() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>); }
function IconMailSm() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>); }
function IconPhone() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>); }
function ChevronDown() { return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>); }
function ChevronRight() { return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>); }
function ChevronVertical() { return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 15 12 20 17 15"/><polyline points="7 9 12 4 17 9"/></svg>); }
function CheckBadge() { return (<svg width="12" height="12" viewBox="0 0 24 24" fill={BLUE} xmlns="http://www.w3.org/2000/svg"><path d="M12 2 L14 4 L17 4 L18 6 L20 7 L20 10 L21 12 L20 14 L20 17 L18 18 L17 20 L14 20 L12 22 L10 20 L7 20 L6 18 L4 17 L4 14 L3 12 L4 10 L4 7 L6 6 L7 4 L10 4 Z" /><path d="M9 12 L11 14 L15 10" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>); }
