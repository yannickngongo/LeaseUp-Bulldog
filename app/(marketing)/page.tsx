import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Reveal, CountUp } from "@/components/marketing/Reveal";
import { PipelineAnim } from "@/components/marketing/PipelineAnim";
import { IconBolt, IconBrain, IconCalendar, IconShield, IconArrowRight } from "@/components/marketing/Icons";

// LUB landing — Autonity-style structure with LUB red palette.
// Uses shared MarketingNav/Footer + shared Reveal + shared PipelineAnim for cross-page consistency.

const RED = "#C8102E";
const BG = "#08080F";
const SURFACE = "#10101A";
const BORDER = "#1E1E2E";
const MUTED = "#9CA3AF";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans overflow-hidden">

      {/* Page-local keyframes (marquee + scan + glow-card hover) */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes scan { 0% { transform: translateY(-50%); } 100% { transform: translateY(50%); } }
        .glow-card { transition: border-color 300ms, box-shadow 300ms, transform 300ms; }
        .glow-card:hover { border-color: ${RED}80; box-shadow: 0 0 40px ${RED}25, inset 0 0 20px ${RED}10; transform: translateY(-3px); }
      `}</style>

      <MarketingNav />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-12">

        {/* Soft red ambient glow at top */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[420px] w-[900px] rounded-full"
          style={{ background: `radial-gradient(ellipse, ${RED}18 0%, transparent 70%)`, filter: "blur(80px)" }}
        />

        {/* Faint grid texture across whole hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: `linear-gradient(${RED}10 1px, transparent 1px), linear-gradient(90deg, ${RED}10 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            maskImage: `radial-gradient(ellipse at 50% 60%, black 30%, transparent 75%)`,
            WebkitMaskImage: `radial-gradient(ellipse at 50% 60%, black 30%, transparent 75%)`,
          }}
        />

        {/* Title block */}
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <Reveal>
            <div
              className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm"
              style={{ borderColor: `${RED}40`, background: `${RED}10`, color: "#F87171" }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full pulse-dot" style={{ background: RED }} />
              AI Leasing Automation
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="mb-6 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-[88px]">
              AI Leasing<br />
              <span className="text-[#C8102E]">Automation</span><br />
              for Multifamily.
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mx-auto mb-10 max-w-2xl text-base font-medium leading-relaxed text-gray-300 sm:text-lg">
              LeaseUp Bulldog replies to every lead in under 60 seconds, qualifies them with AI,
              books tours automatically — so your portfolio fills itself.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/waitlist"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#C8102E] px-8 py-4 text-base font-bold text-white transition-all hover:scale-105 sm:w-auto"
                style={{ boxShadow: `0 0 40px ${RED}80` }}
              >
                Start Free Trial
                <IconArrowRight size={16} />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#1E1E2E] bg-[#10101A] px-8 py-4 text-base font-semibold text-white transition-colors hover:border-white sm:w-auto"
                style={{ backdropFilter: "blur(8px)" }}
              >
                See It Work
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Pipeline animation — flows naturally below the title */}
        <Reveal delay={400}>
          <div className="relative z-10 mx-auto mt-16 h-[500px] max-w-7xl sm:h-[560px]">
            <PipelineAnim />
          </div>
        </Reveal>
      </section>

      {/* ── Logo marquee ──────────────────────────────────────────────────── */}
      <section className="relative border-y py-8" style={{ borderColor: BORDER, background: `${SURFACE}80` }}>
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
          Connects to every lead source operators already use
        </p>
        <div className="overflow-hidden">
          <div className="flex w-max items-center gap-16 whitespace-nowrap" style={{ animation: "marquee 30s linear infinite" }}>
            {[...Array(2)].flatMap((_, dup) =>
              ["Zillow", "Apartments.com", "AppFolio", "Facebook Lead Ads", "HubSpot CRM", "RealPage", "Yardi", "Google Ads"].map((name) => (
                <span key={`${dup}-${name}`} className="text-2xl font-bold tracking-tight text-[#4A5552]">
                  {name}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Capabilities ─────────────────────────────────────────────────── */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-16 max-w-3xl">
            <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-[#C8102E]">
              ── Capabilities
            </span>
            <h2 className="mb-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Built to Fill Units<br />
              <span className="text-[#C8102E]">Faster Than You Could.</span>
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: IconBolt, title: "Reply in 60 seconds", body: "Every inquiry gets a personalized SMS within a minute — including the 9pm leads your team will never see." },
              { Icon: IconBrain, title: "Qualify automatically", body: "AI confirms move-in date, budget, and unit type across 2-3 conversational messages. Bad fits politely set aside." },
              { Icon: IconCalendar, title: "Book tours, not chases", body: "Once qualified, the AI offers calendar slots and books the tour. Your team walks in already knowing the prospect." },
              { Icon: IconShield, title: "Fair Housing aware", body: "Built-in guardrails refuse to discuss anything that crosses Fair Housing lines. Conversations are logged for audit." },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 100}>
                <div className="glow-card group h-full rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/10 text-[#F87171]">
                    <card.Icon />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-white">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow Transparency (split + mock conversation) ────────────── */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">

            <Reveal>
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-[#C8102E]">
                ── Transparency
              </span>
              <h2 className="mb-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                Watch every conversation<br />
                <span className="text-[#C8102E]">in real time.</span>
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-gray-400">
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
                  <li key={item} className="flex items-start gap-3 text-base text-gray-300">
                    <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#C8102E]/20 text-[#F87171]">✓</span>
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
                  style={{ background: `linear-gradient(180deg, transparent, ${RED}15, transparent)`, animation: "scan 4s ease-in-out infinite" }}
                />
                <div className="rounded-xl p-6" style={{ background: BG }}>
                  {/* Browser bar */}
                  <div className="mb-5 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                    <span className="ml-3 flex-1 truncate rounded bg-[#10101A] px-2 py-1 text-[10px] text-gray-500">
                      app.leaseupbulldog.com/conversations
                    </span>
                  </div>

                  {/* Mock conversation */}
                  <div className="space-y-3 text-sm">
                    <div className="flex items-baseline justify-between text-[10px] uppercase tracking-widest text-gray-500">
                      <span>Jordan E. · Move-in Aug 15 · 1BR · $1,800</span>
                      <span className="text-[#F87171]">● Qualified</span>
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
                          className="max-w-[85%] rounded-2xl border px-4 py-2.5"
                          style={{
                            background: msg.who === "ai" ? `${RED}10` : SURFACE,
                            borderColor: msg.who === "ai" ? `${RED}30` : BORDER,
                          }}
                        >
                          <p className="text-sm text-white">{msg.text}</p>
                          <span className="mt-1 block text-[9px] uppercase tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>{msg.time}</span>
                        </div>
                      </div>
                    ))}

                    <div className="mt-3 flex items-center gap-2 rounded-lg border p-3" style={{ borderColor: `${RED}30`, background: `${RED}05` }}>
                      <span className="inline-block h-2 w-2 rounded-full pulse-dot" style={{ background: RED }} />
                      <span className="text-xs text-[#F87171]">Tour booked · Saturday, Aug 9 · 10:00 AM · Calendar invite sent</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Stats counters ───────────────────────────────────────────────── */}
      <section className="border-y px-6 py-20" style={{ borderColor: BORDER, background: SURFACE }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { to: 60, suffix: "s", label: "Avg first reply" },
            { to: 3, suffix: "×", label: "More tours booked" },
            { to: 100, suffix: "%", label: "After-hours coverage" },
            { to: 47, suffix: "k", label: "Saved per property/yr" },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80} className="text-center">
              <p className="text-5xl font-black tracking-tight text-[#C8102E] md:text-6xl">
                <CountUp to={stat.to} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-sm text-gray-400">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How It Works (6-step grid) ───────────────────────────────────── */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-16 text-center">
            <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-[#C8102E]">
              ── How it works
            </span>
            <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              AI-Powered Automation<br />
              <span className="text-[#C8102E]">Without the Mystery.</span>
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
                <div className="glow-card h-full rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6">
                  <div className="mb-5 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[#C8102E]" style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>{step.num}</span>
                    <span className="h-px w-12" style={{ background: `${RED}40` }} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section id="testimonials" className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-16">
            <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-[#C8102E]">
              ── Operators
            </span>
            <h2 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              From the leasing offices<br />
              <span className="text-[#C8102E]">that already shipped it.</span>
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              { quote: "We were losing 40% of after-hours leads. Now we lose zero. Paid for itself in three signed leases the first month.", name: "Sarah K.", role: "Owner-operator · 280 units · Dallas TX" },
              { quote: "The AI doesn't sound like a chatbot. Half my prospects don't realize they're not texting a person until they tour the property.", name: "Marcus R.", role: "Property manager · 150 units · Austin TX" },
              { quote: "My leasing team used to drown in nights and weekends. Now they walk in Monday with eight tours already booked.", name: "Priya N.", role: "Regional director · 1,200 units · Houston TX" },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <article className="glow-card flex h-full flex-col rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-7">
                  <p className="mb-6 text-base leading-relaxed text-white">
                    <span className="text-3xl leading-none text-[#C8102E]">&ldquo;</span>
                    {t.quote}
                  </p>
                  <div className="mt-auto flex items-center gap-3 border-t border-[#1E1E2E] pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C8102E] text-sm font-bold text-white">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 text-center">
            <Link
              href="/customers"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#F87171] hover:text-white transition-colors"
            >
              See all customers <IconArrowRight size={14} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: `radial-gradient(ellipse at 50% 50%, ${RED}15 0%, transparent 60%)` }}
        />

        <Reveal className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-5xl font-black leading-[1.0] tracking-tight sm:text-6xl md:text-7xl">
            Ready to Fill<br />
            <span className="text-[#C8102E]">Faster?</span>
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-gray-400">
            14-day free trial. No credit card. We&apos;ll set up your first property with you on a 15-minute call.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/waitlist"
              className="inline-flex items-center gap-2 rounded-full bg-[#C8102E] px-10 py-5 text-base font-bold text-white transition-all hover:scale-105"
              style={{ boxShadow: `0 0 60px ${RED}80` }}
            >
              Start Free Trial <IconArrowRight size={16} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-[#1E1E2E] bg-[#10101A] px-10 py-5 text-base font-semibold text-white transition-colors hover:border-white"
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
