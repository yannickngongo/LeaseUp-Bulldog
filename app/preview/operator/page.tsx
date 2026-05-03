import Link from "next/link";

// PREVIEW: Direction C — Multifamily operator vernacular
// Aged paper + forest green + brick red + navy. Floor-plan motifs. Hand-drawn feel.

export const metadata = { title: "LeaseUp Bulldog — Operator Preview" };

const DISPLAY = "'Source Serif 4', 'Georgia', serif";
const SANS = "'Inter', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const PAPER = "#FBF7F0";
const INK = "#1F1B16";
const FOREST = "#1F4A3F";
const BRICK = "#C8102E";
const TAN = "#C9A876";
const NAVY = "#1A2740";

export default function OperatorPreview() {
  return (
    <div style={{ background: PAPER, color: INK, fontFamily: SANS }} className="min-h-screen">

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* Subtle blueprint grid background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(${INK}08 1px, transparent 1px), linear-gradient(90deg, ${INK}08 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10">

        {/* ── Nav ───────────────────────────────────────────────────────────── */}
        <nav className="border-b px-6 py-5" style={{ borderColor: `${INK}20` }}>
          <div className="mx-auto flex max-w-[1280px] items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              {/* Tiny bulldog mark */}
              <BulldogMark />
              <span className="text-xl font-black tracking-tight" style={{ color: INK }}>
                LeaseUp<span style={{ color: BRICK }}>Bulldog</span>
              </span>
            </Link>
            <div className="hidden items-center gap-8 text-sm font-medium md:flex">
              <Link href="/how-it-works" className="hover:opacity-60">How it works</Link>
              <Link href="/features" className="hover:opacity-60">Features</Link>
              <Link href="/pricing" className="hover:opacity-60">Pricing</Link>
              <Link href="/login" className="hover:opacity-60">Log in</Link>
            </div>
            <Link
              href="/waitlist"
              className="rounded-sm px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: FOREST }}
            >
              Schedule a walkthrough
            </Link>
          </div>
        </nav>

        {/* ── Top tag bar — feels like a lease document header ──────────────── */}
        <div
          className="border-b px-6 py-2 text-xs uppercase tracking-widest"
          style={{ borderColor: `${INK}20`, fontFamily: MONO, color: `${INK}70` }}
        >
          <div className="mx-auto flex max-w-[1280px] items-center justify-between">
            <span>Form LB-001 · Lease-Up Operations Brief</span>
            <span>Effective 2026 · Property type: Multifamily · Status: Active</span>
          </div>
        </div>

        {/* ── Hero: copy left, floor plan right ─────────────────────────────── */}
        <section className="px-6 pb-16 pt-20">
          <div className="mx-auto grid max-w-[1280px] grid-cols-12 gap-12">

            <div className="col-span-12 lg:col-span-7">
              <div className="mb-8 inline-flex items-center gap-3 border-l-2 pl-4 text-xs uppercase tracking-[0.25em]" style={{ borderColor: BRICK, color: `${INK}70`, fontFamily: MONO }}>
                Built by a multifamily operator. For multifamily operators.
              </div>

              <h1
                className="mb-8 leading-[1.02] tracking-tight"
                style={{ fontFamily: DISPLAY, fontSize: "clamp(2.75rem, 6vw, 5.75rem)", fontWeight: 600, color: INK }}
              >
                Stop losing leads<br />
                at <span style={{ color: BRICK }}>8 p.m.</span>
              </h1>

              <p className="mb-10 max-w-xl text-lg leading-[1.7]" style={{ color: `${INK}AA` }}>
                Your leasing team goes home at six. Your prospects don&apos;t stop searching at six.
                LeaseUp Bulldog sits at the front desk twenty-four hours a day, replies in under a
                minute, qualifies the lead, and books the tour — so the next lease isn&apos;t the one
                that got away.
              </p>

              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/waitlist"
                  className="rounded-sm px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                  style={{ background: BRICK }}
                >
                  Schedule a walkthrough
                </Link>
                <Link
                  href="/how-it-works"
                  className="rounded-sm border px-7 py-3.5 text-base font-semibold transition-colors hover:bg-black/5"
                  style={{ borderColor: `${INK}40`, color: INK }}
                >
                  See a sample conversation
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs uppercase tracking-widest" style={{ color: `${INK}70`, fontFamily: MONO }}>
                <span>● Zillow</span>
                <span>● Apartments.com</span>
                <span>● AppFolio</span>
                <span>● Facebook Lead Ads</span>
                <span>● HubSpot</span>
              </div>
            </div>

            {/* "Floor plan" SVG — units labeled with product features */}
            <div className="col-span-12 lg:col-span-5">
              <FloorPlanDiagram />
              <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: MONO, color: `${INK}70` }}>
                <span>Fig. A — Lease-up workflow, plan view</span>
                <span>Scale 1:1</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── The day in the life — operator-voiced ────────────────────────── */}
        <section className="border-y px-6 py-20" style={{ borderColor: `${INK}20`, background: `${TAN}15` }}>
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-16 max-w-3xl">
              <div className="mb-4 text-xs uppercase tracking-[0.25em]" style={{ fontFamily: MONO, color: BRICK }}>
                § 02 — A typical Tuesday
              </div>
              <h2
                className="leading-[1.05] tracking-tight"
                style={{ fontFamily: DISPLAY, fontSize: "clamp(2rem, 4vw, 3.5rem)", fontWeight: 600 }}
              >
                Here is the day you stop having.
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  time: "8:14 AM",
                  before: "You arrive to 23 overnight inquiries. You start replying. By the time you finish, four prospects have already toured a competitor.",
                  after: "You arrive to 23 inquiries already replied to. Six tours booked overnight. You walk into the leasing office and start your day at the close, not the chase.",
                },
                {
                  time: "12:47 PM",
                  before: "A lead comes in mid-tour. You miss it. They sign elsewhere by Friday.",
                  after: "A lead comes in mid-tour. The AI replies in 47 seconds, qualifies them, and offers a Saturday slot. You see the booking on your phone between units.",
                },
                {
                  time: "9:32 PM",
                  before: "Lead from Zillow. You see it Wednesday morning. They went with Camden.",
                  after: "Lead from Zillow. Replied to in under a minute, conversation continues for three rounds, tour booked for Saturday at 10. You read it over coffee tomorrow.",
                },
              ].map((moment) => (
                <div key={moment.time}>
                  <div className="mb-4 text-sm font-bold uppercase tracking-widest" style={{ color: BRICK, fontFamily: MONO }}>
                    {moment.time}
                  </div>
                  <div className="mb-4 border-l-2 pl-4 text-sm italic leading-relaxed" style={{ borderColor: `${INK}30`, color: `${INK}80`, fontFamily: DISPLAY }}>
                    Before: {moment.before}
                  </div>
                  <div className="border-l-2 pl-4 text-base leading-relaxed" style={{ borderColor: FOREST, color: INK }}>
                    <span className="font-semibold" style={{ color: FOREST }}>After:</span> {moment.after}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pull quote — large block ─────────────────────────────────────── */}
        <section className="px-6 py-28" style={{ background: NAVY, color: PAPER }}>
          <div className="mx-auto max-w-[1100px]">
            <div className="mb-8 text-xs uppercase tracking-[0.3em]" style={{ color: TAN, fontFamily: MONO }}>
              Field Note · Operator, 280 units, Dallas TX
            </div>
            <blockquote
              className="leading-[1.1] tracking-tight"
              style={{ fontFamily: DISPLAY, fontSize: "clamp(1.75rem, 4vw, 3.25rem)", fontWeight: 500 }}
            >
              We were losing forty percent of our after-hours leads. Bulldog catches every one
              of them. The first month it paid for itself in <span style={{ color: BRICK }}>three signed leases</span>.
              Now I cannot remember how we ran the office without it.
            </blockquote>
          </div>
        </section>

        {/* ── Pricing — laid out like a lease term sheet ───────────────────── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-12 flex items-baseline justify-between border-b pb-4" style={{ borderColor: `${INK}30` }}>
              <h2
                className="leading-tight tracking-tight"
                style={{ fontFamily: DISPLAY, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", fontWeight: 600 }}
              >
                § 03 — Schedule of fees.
              </h2>
              <span className="text-xs uppercase tracking-widest" style={{ fontFamily: MONO, color: `${INK}70` }}>
                Annexed to the master agreement
              </span>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: `${INK}30` }}>
                  <th className="py-4 pr-4 text-left text-xs uppercase tracking-widest" style={{ fontFamily: MONO, color: `${INK}70` }}>Plan</th>
                  <th className="py-4 px-4 text-left text-xs uppercase tracking-widest" style={{ fontFamily: MONO, color: `${INK}70` }}>Best for</th>
                  <th className="py-4 px-4 text-right text-xs uppercase tracking-widest" style={{ fontFamily: MONO, color: `${INK}70` }}>Monthly</th>
                  <th className="py-4 pl-4 text-right text-xs uppercase tracking-widest" style={{ fontFamily: MONO, color: `${INK}70` }}>Per signed lease</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { plan: "Starter", best: "1 property, up to 100 units", monthly: "$500", perLease: "$200" },
                  { plan: "Pro", best: "2–10 properties", monthly: "$1,500", perLease: "$150" },
                  { plan: "Portfolio", best: "10+ properties or 1,000+ units", monthly: "$3,000", perLease: "$100" },
                ].map((row, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: `${INK}20` }}>
                    <td className="py-6 pr-4">
                      <div className="text-lg font-bold" style={{ fontFamily: DISPLAY }}>{row.plan}</div>
                    </td>
                    <td className="py-6 px-4 text-sm" style={{ color: `${INK}90` }}>{row.best}</td>
                    <td className="py-6 px-4 text-right text-2xl font-bold tracking-tight" style={{ color: INK }}>{row.monthly}</td>
                    <td className="py-6 pl-4 text-right text-lg font-medium" style={{ color: FOREST, fontFamily: MONO }}>+ {row.perLease}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-6 text-xs uppercase tracking-widest" style={{ fontFamily: MONO, color: `${INK}60` }}>
              Per-lease fee assessed only on signed leases attributed to a Bulldog conversation within 30 days. 14-day free trial. Cancel any time.
            </p>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="border-t px-6 py-24" style={{ borderColor: `${INK}30`, background: `${FOREST}08` }}>
          <div className="mx-auto max-w-[1280px] text-center">
            <h2
              className="mx-auto mb-8 max-w-3xl leading-[1.05] tracking-tight"
              style={{ fontFamily: DISPLAY, fontSize: "clamp(2rem, 4.5vw, 4rem)", fontWeight: 600 }}
            >
              Walk through the platform with me.
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed" style={{ color: `${INK}AA` }}>
              Fifteen minutes. We will set up your first property together, plug in your lead
              sources, and watch the AI work the next inquiry that comes in.
            </p>
            <Link
              href="/waitlist"
              className="inline-block rounded-sm px-9 py-4 text-base font-semibold text-white shadow-sm hover:opacity-90"
              style={{ background: BRICK }}
            >
              Schedule the walkthrough →
            </Link>
            <div className="mt-6 text-xs uppercase tracking-widest" style={{ fontFamily: MONO, color: `${INK}70` }}>
              — Yannick · founder, multifamily operator
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="border-t px-6 py-10" style={{ borderColor: `${INK}20` }}>
          <div className="mx-auto flex max-w-[1280px] flex-col gap-6 md:flex-row md:items-baseline md:justify-between">
            <div className="flex items-center gap-3">
              <BulldogMark />
              <span className="text-xl font-black tracking-tight">
                LeaseUp<span style={{ color: BRICK }}>Bulldog</span>
              </span>
            </div>
            <div className="text-xs uppercase tracking-[0.2em]" style={{ fontFamily: MONO, color: `${INK}70` }}>
              © 2026 · 880 Union Station Prkwy · Lewisville, TX
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

// Tiny bulldog mark — line illustration style, no AI mascot energy
function BulldogMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* head */}
      <path
        d="M6 14c0-4.5 4-8 10-8s10 3.5 10 8v6c0 3-2 5-5 5h-2l-1 2h-4l-1-2h-2c-3 0-5-2-5-5v-6z"
        stroke="#1F1B16"
        strokeWidth="1.5"
        fill="#FBF7F0"
        strokeLinejoin="round"
      />
      {/* eyes */}
      <circle cx="12" cy="15" r="1.2" fill="#1F1B16" />
      <circle cx="20" cy="15" r="1.2" fill="#1F1B16" />
      {/* nose */}
      <path d="M14 19h4l-2 2z" fill="#C8102E" />
      {/* jowls */}
      <path d="M11 21c1 1 2 1.5 5 1.5s4-.5 5-1.5" stroke="#1F1B16" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* ears */}
      <path d="M8 11l-2-3 4 1z" fill="#1F1B16" />
      <path d="M24 11l2-3-4 1z" fill="#1F1B16" />
    </svg>
  );
}

// Floor plan SVG — schematic of "the workflow" rendered as architectural plan
function FloorPlanDiagram() {
  return (
    <svg viewBox="0 0 480 540" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Floor plan showing the lease-up workflow">
      {/* Outer wall */}
      <rect x="20" y="20" width="440" height="500" fill="none" stroke="#1F1B16" strokeWidth="3" />
      {/* Inner walls */}
      <line x1="20" y1="200" x2="280" y2="200" stroke="#1F1B16" strokeWidth="2" />
      <line x1="280" y1="20" x2="280" y2="320" stroke="#1F1B16" strokeWidth="2" />
      <line x1="20" y1="360" x2="460" y2="360" stroke="#1F1B16" strokeWidth="2" />
      <line x1="220" y1="360" x2="220" y2="520" stroke="#1F1B16" strokeWidth="2" />
      {/* Doors */}
      <path d="M150 200 A 30 30 0 0 1 150 230" fill="none" stroke="#1F1B16" strokeWidth="1" />
      <path d="M280 250 A 30 30 0 0 1 250 250" fill="none" stroke="#1F1B16" strokeWidth="1" />
      <path d="M120 360 A 30 30 0 0 1 120 390" fill="none" stroke="#1F1B16" strokeWidth="1" />
      <path d="M340 360 A 30 30 0 0 1 340 390" fill="none" stroke="#1F1B16" strokeWidth="1" />

      {/* Room labels */}
      <g fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#1F1B16">
        <text x="40" y="50" fontWeight="700">UNIT 01 — INTAKE</text>
        <text x="40" y="68" fill="#1F1B16AA">Lead arrives from</text>
        <text x="40" y="82" fill="#1F1B16AA">Zillow / Apts.com / web</text>

        <text x="300" y="50" fontWeight="700">UNIT 02 — REPLY</text>
        <text x="300" y="68" fill="#1F1B16AA">AI sends first SMS</text>
        <text x="300" y="82" fill="#1F1B16AA">in &lt; 60 seconds</text>

        <text x="40" y="230" fontWeight="700">UNIT 03 — QUALIFY</text>
        <text x="40" y="248" fill="#1F1B16AA">Move-in date · budget</text>
        <text x="40" y="262" fill="#1F1B16AA">Unit type · pets · etc.</text>

        <text x="300" y="230" fontWeight="700">UNIT 04 — SCHEDULE</text>
        <text x="300" y="248" fill="#1F1B16AA">Tour booked on your</text>
        <text x="300" y="262" fill="#1F1B16AA">calendar, automatically</text>

        <text x="40" y="390" fontWeight="700">UNIT 05 — HANDOFF</text>
        <text x="40" y="408" fill="#1F1B16AA">Your team picks up</text>
        <text x="40" y="422" fill="#1F1B16AA">with full context</text>

        <text x="240" y="390" fontWeight="700">UNIT 06 — TOUR</text>
        <text x="240" y="408" fill="#1F1B16AA">Reminder sent</text>
        <text x="240" y="422" fill="#1F1B16AA">24h prior</text>
      </g>

      {/* Marker dots colored brick red */}
      <circle cx="200" cy="40" r="4" fill="#C8102E" />
      <circle cx="450" cy="40" r="4" fill="#C8102E" />
      <circle cx="200" cy="220" r="4" fill="#C8102E" />
      <circle cx="450" cy="220" r="4" fill="#C8102E" />
      <circle cx="200" cy="380" r="4" fill="#C8102E" />
      <circle cx="450" cy="380" r="4" fill="#C8102E" />

      {/* Compass / north arrow */}
      <g transform="translate(420, 480)">
        <circle r="22" fill="none" stroke="#1F1B16" strokeWidth="1" />
        <path d="M0 -16 L 5 4 L 0 0 L -5 4 Z" fill="#C8102E" />
        <text x="0" y="-22" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#1F1B16">N</text>
      </g>

      {/* Title block — bottom left */}
      <g transform="translate(40, 470)">
        <rect width="180" height="44" fill="none" stroke="#1F1B16" strokeWidth="1" />
        <text x="8" y="16" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#1F1B16" fontWeight="700">PROJECT: LEASE-UP</text>
        <text x="8" y="30" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#1F1B16AA">DRAWING: A.01</text>
        <text x="8" y="42" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#1F1B16AA">DATE: 05.2026</text>
      </g>
    </svg>
  );
}
