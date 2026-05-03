import Link from "next/link";
import { Reveal, CountUp } from "./Reveal";
import { PipelineAnim } from "../heroes/_lib/animations";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

// PREVIEW: Direction D — Autonity-style layout, LUB color scheme.
// Dark layered bg + red accent. Glowing sphere hero, perspective grid, rotating wireframe,
// scroll reveals, marquee, pulsing accents — all in LUB red instead of neon green.

export const metadata = { title: "LeaseUp Bulldog — Landing Preview" };

// LUB brand tokens (matches current leaseupbulldog.com)
const GREEN = "#C8102E";       // primary accent (renamed-but-not-renamed; was green, now LUB red)
const GREEN_DIM = "#A50D25";   // hover / darker red
const BG = "#08080F";          // page bg
const SURFACE = "#10101A";     // raised surface
const BORDER = "#1E1E2E";      // borders / dividers
const MUTED = "#9CA3AF";       // muted body text (Tailwind gray-400)
const RED = "#C8102E";         // wordmark "Bulldog"

export default function AutonityPreview() {
  return (
    <div style={{ background: BG, color: "#FFFFFF" }} className="min-h-screen overflow-hidden">

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* Global keyframes for the page */}
      <style>{`
        :root { --green: ${GREEN}; --green-dim: ${GREEN_DIM}; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-rev   { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes float-up { 0% { transform: translateY(20px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-260px); opacity: 0; } }
        @keyframes scan { 0% { transform: translateY(-50%); } 100% { transform: translateY(50%); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 ${GREEN}80; } 50% { opacity: 0.7; box-shadow: 0 0 0 6px ${GREEN}00; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .glow-text { text-shadow: 0 0 30px ${GREEN}40; }
        .glow-card:hover { border-color: ${GREEN}80; box-shadow: 0 0 40px ${GREEN}25, inset 0 0 20px ${GREEN}10; }
        .glow-card { transition: border-color 300ms, box-shadow 300ms, transform 300ms; }
        .glow-card:hover { transform: translateY(-3px); }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
        body { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>

      <MarketingNav />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-12">

        {/* Soft red ambient glow at top */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[420px] w-[900px] rounded-full"
          style={{ background: `radial-gradient(ellipse, ${GREEN}18 0%, transparent 70%)`, filter: "blur(80px)" }}
        />

        {/* Faint grid texture across whole hero — same vocabulary as the dashboard preview, ties everything together */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: `linear-gradient(${GREEN}10 1px, transparent 1px), linear-gradient(90deg, ${GREEN}10 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            maskImage: `radial-gradient(ellipse at 50% 60%, black 30%, transparent 75%)`,
            WebkitMaskImage: `radial-gradient(ellipse at 50% 60%, black 30%, transparent 75%)`,
          }}
        />

        {/* Title block */}
        <div className="relative z-10 mx-auto max-w-5xl text-center">

          <div className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest" style={{ borderColor: `${GREEN}40`, background: `${GREEN}10`, color: "#F87171", backdropFilter: "blur(8px)" }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full pulse-dot" style={{ background: GREEN }} />
            AI Leasing Automation
          </div>

          <h1 className="mb-6 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-[88px]">
            AI Leasing<br />
            <span style={{ color: GREEN }}>Automation</span><br />
            for Multifamily.
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-base font-medium leading-relaxed text-gray-300 sm:text-lg">
            LeaseUp Bulldog replies to every lead in under 60 seconds, qualifies them with AI,
            books tours automatically — so your portfolio fills itself.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/waitlist"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white transition-all hover:scale-105 sm:w-auto"
              style={{ background: GREEN, boxShadow: `0 0 40px ${GREEN}80` }}
            >
              Start Free Trial
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-8 py-4 text-base font-semibold text-white transition-colors hover:border-white sm:w-auto"
              style={{ borderColor: BORDER, background: SURFACE, backdropFilter: "blur(8px)" }}
            >
              See It Work
            </Link>
          </div>
        </div>

        {/* Pipeline animation — flows naturally below the title, no hard frame */}
        <div className="relative z-10 mx-auto mt-16 h-[500px] max-w-7xl sm:h-[560px]">
          <PipelineAnim />
        </div>
      </section>

      {/* ── Logo marquee ────────────────────────────────────────────────────── */}
      <section className="relative border-y py-8" style={{ borderColor: BORDER, background: `${SURFACE}80` }}>
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: MUTED }}>
          Connects to every lead source operators already use
        </p>
        <div className="overflow-hidden">
          <div className="flex w-max items-center gap-16 whitespace-nowrap" style={{ animation: "marquee 30s linear infinite" }}>
            {[...Array(2)].flatMap((_, dup) =>
              ["Zillow", "Apartments.com", "AppFolio", "Facebook Lead Ads", "HubSpot CRM", "RealPage", "Yardi", "Google Ads"].map((name) => (
                <span key={`${dup}-${name}`} className="text-2xl font-bold tracking-tight" style={{ color: "#4A5552" }}>
                  {name}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Built to Move You Forward (4 feature cards) ─────────────────────── */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-16 max-w-3xl">
            <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: GREEN }}>
              ── Capabilities
            </span>
            <h2 className="mb-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Built to Fill Units<br />
              <span style={{ color: GREEN }}>
                Faster Than You Could.
              </span>
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <IconBolt />,
                title: "Reply in 60 seconds",
                body: "Every inquiry gets a personalized SMS within a minute — including the 9pm leads your team will never see.",
              },
              {
                icon: <IconBrain />,
                title: "Qualify automatically",
                body: "AI confirms move-in date, budget, and unit type across 2-3 conversational messages. Bad fits politely set aside.",
              },
              {
                icon: <IconCalendar />,
                title: "Book tours, not chases",
                body: "Once qualified, the AI offers calendar slots and books the tour. Your team walks in already knowing the prospect.",
              },
              {
                icon: <IconShield />,
                title: "Fair Housing aware",
                body: "Built-in guardrails refuse to discuss anything that crosses Fair Housing lines. Conversations are logged for audit.",
              },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 100}>
                <div className="glow-card group h-full rounded-2xl border p-6" style={{ borderColor: BORDER, background: SURFACE }}>
                  <div
                    className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border"
                    style={{ borderColor: `${GREEN}30`, background: `${GREEN}10`, color: GREEN }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-white">{card.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow Transparency (mock UI panel) ───────────────────────────── */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">

            <Reveal>
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: GREEN }}>
                ── Transparency
              </span>
              <h2 className="mb-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                Watch every conversation<br />
                <span style={{ color: GREEN }}>
                  in real time.
                </span>
              </h2>
              <p className="mb-8 text-lg leading-relaxed" style={{ color: MUTED }}>
                No black box. Every AI message, every prospect reply, every qualification decision —
                visible, searchable, and one click away from manual takeover.
              </p>
              <ul className="space-y-4">
                {[
                  "Live conversation feed across all properties",
                  "One-click manual takeover at any moment",
                  "Sentiment + qualification flags per lead",
                  "Full audit log of every AI decision",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base" style={{ color: "#C9D1CD" }}>
                    <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: `${GREEN}20`, color: GREEN }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={150}>
              <div
                className="relative overflow-hidden rounded-2xl border p-1"
                style={{ borderColor: BORDER, background: `linear-gradient(135deg, ${SURFACE} 0%, #050705 100%)` }}
              >
                {/* Subtle scan line */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 h-32 opacity-40"
                  style={{
                    background: `linear-gradient(180deg, transparent, ${GREEN}15, transparent)`,
                    animation: "scan 4s ease-in-out infinite",
                  }}
                />
                <div className="rounded-xl p-6" style={{ background: BG }}>
                  {/* Browser bar */}
                  <div className="mb-5 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#FF5F57" }} />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28C840" }} />
                    <span className="ml-3 flex-1 truncate rounded px-2 py-1 text-[10px]" style={{ background: SURFACE, color: MUTED }}>
                      app.leaseupbulldog.com/conversations
                    </span>
                  </div>

                  {/* Mock conversation */}
                  <div className="space-y-3 text-sm">
                    <div className="flex items-baseline justify-between text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
                      <span>Jordan E. · Move-in Aug 15 · 1BR · $1,800</span>
                      <span style={{ color: GREEN }}>● Qualified</span>
                    </div>
                    {[
                      { who: "ai", time: "9:14 PM", text: "Hi Jordan, this is Sam from The Standard. I saw you inquired about our 1BRs — when are you hoping to move in?" },
                      { who: "lead", time: "9:14 PM", text: "Looking at mid-August, ideally under $1,900" },
                      { who: "ai", time: "9:15 PM", text: "Perfect — we have a 1BR available Aug 11 at $1,795. Would Saturday at 10am work for a tour?" },
                      { who: "lead", time: "9:15 PM", text: "Yes that works!" },
                      { who: "ai", time: "9:15 PM", text: "Booked. You'll get a confirmation text shortly. See you Saturday." },
                    ].map((msg, i) => (
                      <div key={i} className={`flex ${msg.who === "lead" ? "justify-end" : "justify-start"}`}>
                        <div
                          className="max-w-[85%] rounded-2xl px-4 py-2.5"
                          style={{
                            background: msg.who === "ai" ? `${GREEN}10` : SURFACE,
                            borderColor: msg.who === "ai" ? `${GREEN}30` : BORDER,
                            borderWidth: 1,
                          }}
                        >
                          <p className="text-sm" style={{ color: msg.who === "ai" ? "#E8FFF0" : "#D9E0DC" }}>{msg.text}</p>
                          <span className="mt-1 block text-[9px] uppercase tracking-widest" style={{ color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>{msg.time}</span>
                        </div>
                      </div>
                    ))}

                    <div className="mt-3 flex items-center gap-2 rounded-lg border p-3" style={{ borderColor: `${GREEN}30`, background: `${GREEN}05` }}>
                      <span className="inline-block h-2 w-2 rounded-full pulse-dot" style={{ background: GREEN }} />
                      <span className="text-xs" style={{ color: GREEN }}>Tour booked · Saturday, Aug 9 · 10:00 AM · Calendar invite sent</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Stats counters ──────────────────────────────────────────────────── */}
      <section className="border-y px-6 py-20" style={{ borderColor: BORDER, background: SURFACE }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { value: 60, suffix: "s", label: "Avg first reply" },
            { value: 3, suffix: "×", label: "More tours booked" },
            { value: 100, suffix: "%", label: "After-hours coverage" },
            { value: 47, suffix: "k", label: "Saved per property/yr" },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80} className="text-center">
              <p className="text-5xl font-black tracking-tight md:text-6xl" style={{ color: GREEN }}>
                <CountUp to={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-sm" style={{ color: MUTED }}>{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── AI-Powered (split feature list) ─────────────────────────────────── */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-16 text-center">
            <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: GREEN }}>
              ── How it works
            </span>
            <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              AI-Powered Automation<br />
              <span style={{ color: GREEN }}>
                Without the Mystery.
              </span>
            </h2>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { num: "01", title: "Connect your lead sources", body: "Webhook from Zillow, Apartments.com, your website forms, Facebook Lead Ads — anywhere prospects come from." },
              { num: "02", title: "Configure AI behavior", body: "Set tone, specials, units, deal-breakers per property. The AI knows your portfolio inside out." },
              { num: "03", title: "Lead arrives", body: "Within 60 seconds, the AI sends a personalized SMS that references the prospect's intent." },
              { num: "04", title: "Conversation continues", body: "AI qualifies — move-in date, budget, unit type — across 2-3 messages. Sentiment tracked." },
              { num: "05", title: "Tour booked or escalated", body: "Qualified leads get tour slots. Edge cases route to your team with full context." },
              { num: "06", title: "Pay only on signed leases", body: "Performance fee fires only when a Bulldog conversation converts. Skin in the game." },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 80}>
                <div className="glow-card h-full rounded-2xl border p-6" style={{ borderColor: BORDER, background: SURFACE }}>
                  <div className="mb-5 flex items-baseline justify-between">
                    <span className="text-3xl font-black" style={{ color: GREEN, fontFamily: "'JetBrains Mono', monospace" }}>{step.num}</span>
                    <span className="h-px w-12" style={{ background: `${GREEN}40` }} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section id="testimonials" className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-16">
            <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: GREEN }}>
              ── Operators
            </span>
            <h2 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              From the leasing offices<br />
              <span style={{ color: GREEN }}>
                that already shipped it.
              </span>
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                quote: "We were losing 40% of after-hours leads. Now we lose zero. Paid for itself in three signed leases the first month.",
                name: "Sarah K.",
                role: "Owner-operator · 280 units · Dallas TX",
              },
              {
                quote: "The AI doesn't sound like a chatbot. Half my prospects don't realize they're not texting a person until they tour the property.",
                name: "Marcus R.",
                role: "Property manager · 150 units · Austin TX",
              },
              {
                quote: "My leasing team used to drown in nights and weekends. Now they walk in Monday with eight tours already booked.",
                name: "Priya N.",
                role: "Regional director · 1,200 units · Houston TX",
              },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <article className="glow-card flex h-full flex-col rounded-2xl border p-7" style={{ borderColor: BORDER, background: SURFACE }}>
                  <p className="mb-6 text-base leading-relaxed text-white">
                    <span className="text-3xl leading-none" style={{ color: GREEN }}>“</span>
                    {t.quote}
                  </p>
                  <div className="mt-auto flex items-center gap-3 border-t pt-4" style={{ borderColor: BORDER }}>
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-black"
                      style={{ background: GREEN }}
                    >
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs" style={{ color: MUTED }}>{t.role}</p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-32">

        {/* Background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${GREEN}15 0%, transparent 60%)`,
          }}
        />

        <Reveal className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-5xl font-black leading-[1.0] tracking-tight sm:text-6xl md:text-7xl glow-text">
            Ready to Fill<br />
            <span style={{ color: GREEN }}>
              Faster?
            </span>
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed" style={{ color: MUTED }}>
            14-day free trial. No credit card. We&apos;ll set up your first property with you on a 15-minute call.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/waitlist"
              className="inline-flex items-center gap-2 rounded-full px-10 py-5 text-base font-bold text-black transition-all hover:scale-105"
              style={{ background: GREEN, boxShadow: `0 0 60px ${GREEN}60` }}
            >
              Start Free Trial →
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border px-10 py-5 text-base font-semibold text-white transition-colors hover:border-white"
              style={{ borderColor: BORDER }}
            >
              Talk to Founder
            </Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Components
// ─────────────────────────────────────────────────────────────────────────────

function Sphere() {
  // Concentric rings + radial dots forming a wireframe sphere with glow
  const rings = [80, 120, 160, 200];
  const dotPositions = [];
  // Generate "stars" / dots inside the orb
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const r = 60 + (i % 5) * 30;
    dotPositions.push({
      x: 240 + Math.cos(angle) * r,
      y: 240 + Math.sin(angle) * r * 0.6,
    });
  }

  return (
    <div className="relative">
      {/* Halo glow */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${GREEN}55 0%, ${GREEN}15 30%, transparent 70%)`,
          animation: "pulse-glow 4s ease-in-out infinite",
          filter: "blur(20px)",
        }}
      />

      {/* Outer rotating wireframe */}
      <svg
        width="480"
        height="480"
        viewBox="0 0 480 480"
        className="relative"
        style={{ animation: "spin-slow 40s linear infinite" }}
      >
        {/* Latitude lines (ellipses at varying tilts) */}
        {rings.map((r, i) => (
          <g key={`lat-${i}`}>
            <ellipse
              cx="240"
              cy="240"
              rx={r}
              ry={r * 0.35}
              fill="none"
              stroke={GREEN}
              strokeOpacity={0.5 - i * 0.08}
              strokeWidth="1"
            />
            <ellipse
              cx="240"
              cy="240"
              rx={r * 0.35}
              ry={r}
              fill="none"
              stroke={GREEN}
              strokeOpacity={0.5 - i * 0.08}
              strokeWidth="1"
            />
          </g>
        ))}

        {/* Diagonal great circles */}
        <g transform="rotate(30 240 240)">
          <ellipse cx="240" cy="240" rx="200" ry="70" fill="none" stroke={GREEN} strokeOpacity="0.4" strokeWidth="1" />
        </g>
        <g transform="rotate(-30 240 240)">
          <ellipse cx="240" cy="240" rx="200" ry="70" fill="none" stroke={GREEN} strokeOpacity="0.4" strokeWidth="1" />
        </g>

        {/* Outer ring */}
        <circle cx="240" cy="240" r="200" fill="none" stroke={GREEN} strokeOpacity="0.8" strokeWidth="1.5" />
        <circle cx="240" cy="240" r="200" fill="none" stroke={GREEN} strokeOpacity="0.4" strokeWidth="6" filter="blur(4px)" />
      </svg>

      {/* Counter-rotating inner sphere */}
      <svg
        width="320"
        height="320"
        viewBox="0 0 320 320"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ animation: "spin-rev 25s linear infinite" }}
      >
        <defs>
          <radialGradient id="orb-grad" cx="50%" cy="40%">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.4" />
            <stop offset="50%" stopColor={GREEN_DIM} stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <circle cx="160" cy="160" r="130" fill="url(#orb-grad)" />
        <circle cx="160" cy="160" r="130" fill="none" stroke={GREEN} strokeOpacity="0.6" strokeWidth="1" />

        {/* Wireframe meridians */}
        {[0, 30, 60, 90, 120, 150].map((deg) => (
          <ellipse
            key={deg}
            cx="160"
            cy="160"
            rx="130"
            ry="40"
            fill="none"
            stroke={GREEN}
            strokeOpacity="0.3"
            strokeWidth="0.8"
            transform={`rotate(${deg} 160 160)`}
          />
        ))}

        {/* Inner dot grid */}
        {dotPositions.slice(0, 30).map((p, i) => (
          <circle
            key={i}
            cx={(p.x - 240) * 0.55 + 160}
            cy={(p.y - 240) * 0.55 + 160}
            r="1.2"
            fill={GREEN}
            opacity="0.8"
          />
        ))}
      </svg>

      {/* Center bright core */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, #FFFFFF 0%, ${GREEN} 40%, transparent 80%)`,
          animation: "pulse-glow 3s ease-in-out infinite",
          filter: "blur(2px)",
        }}
      />
    </div>
  );
}

// Icons (line style, green-tinted)
function IconBolt() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>); }
function IconBrain() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v1.5A4 4 0 0 0 4 11.5v0a4 4 0 0 0 2 3.46V17a4 4 0 0 0 4 4h0a2 2 0 0 0 2-2V5a3 3 0 0 0-3-3zM12 2a4 4 0 0 1 4 4v1.5A4 4 0 0 1 20 11.5v0a4 4 0 0 1-2 3.46V17a4 4 0 0 1-4 4h0a2 2 0 0 1-2-2V5a3 3 0 0 1 3-3z" /></svg>); }
function IconCalendar() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><circle cx="12" cy="16" r="2" fill="currentColor" /></svg>); }
function IconShield() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>); }
