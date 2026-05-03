import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Reveal } from "@/components/marketing/Reveal";
import { PageBackground } from "@/components/marketing/PageBackground";
import {
  IconBolt,
  IconTarget,
  IconCalendar,
  IconChat,
  IconChart,
  IconShield,
  IconBuilding,
  IconRefresh,
  IconDashboard,
  IconPlug,
  IconLifebuoy,
  IconHandshake,
  IconCheck,
  IconArrowRight,
  IconLock,
} from "@/components/marketing/Icons";
import type { ComponentType } from "react";

export const metadata = {
  title: "The Product — LeaseUp Bulldog",
  description:
    "Three plans built for every stage of your portfolio. From your first property to your thousandth — same product, different scope.",
};

type IconType = ComponentType<{ className?: string; size?: number }>;
type FeatureRow = { Icon: IconType; title: string; desc: string };
type Plan = {
  id: "starter" | "pro" | "portfolio";
  name: string;
  audience: string;
  range: string;
  tagline: string;
  promise: string;
  features: FeatureRow[];
  bestFor: string;
  cta: { label: string; href: string };
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    audience: "For Independent Landlords",
    range: "1–3 properties",
    tagline: "Everything you need to never miss a lead.",
    promise:
      "If you run your own properties and answer your own phone, Starter is the floor that catches every lead you'd otherwise lose to the competitor who replied first.",
    features: [
      {
        Icon: IconBolt,
        title: "AI SMS reply in under 60 seconds",
        desc: "Every new inquiry — from Zillow, Apartments.com, your website form, anywhere — gets a personalized text reply within a minute. The AI references the property, the unit type they asked about, and asks the right next question. Doesn't sound like a chatbot.",
      },
      {
        Icon: IconTarget,
        title: "Automatic lead qualification",
        desc: "Across two or three conversational messages, the AI confirms move-in date, budget, unit type, and pets. No forms. No drop-off. The information shows up in your dashboard pre-filled and ready for a tour booking.",
      },
      {
        Icon: IconCalendar,
        title: "Tour scheduling on autopilot",
        desc: "Once a lead is qualified, the AI offers tour slots from your calendar, books the time, sends a confirmation, and follows up with a reminder 24 hours before. You walk in already knowing the prospect.",
      },
      {
        Icon: IconChat,
        title: "Conversation dashboard",
        desc: "Every lead's full SMS thread, sentiment, qualification flags, and AI decisions in one searchable view. Manual takeover is one click away — type a message and the AI hands the conversation to you mid-stream.",
      },
      {
        Icon: IconChart,
        title: "Occupancy intelligence",
        desc: "Live vacancy tracker per property, lease-up forecasting, and a daily snapshot of where each unit is in the pipeline. Stop guessing how your lease-up is trending.",
      },
      {
        Icon: IconShield,
        title: "Fair Housing & TCPA guardrails",
        desc: "Built-in refusal logic stops the AI from discussing anything that crosses Fair Housing lines. Automatic STOP keyword handling. Full audit log of every AI decision.",
      },
    ],
    bestFor:
      "Owner-operators with 1–3 properties, single-property managers, or first-time PropTech buyers who want every after-hours lead replied to before the competitor does.",
    cta: { label: "Start 14-Day Pilot", href: "/free-trial?plan=starter" },
  },
  {
    id: "pro",
    name: "Pro",
    audience: "For Regional Operators",
    range: "4–20 properties",
    tagline: "Scale to dozens of properties without scaling your team.",
    promise:
      "When one property becomes ten, lead volume becomes a real problem. Pro gives you portfolio-wide visibility, owner reporting, and the integrations you'd otherwise glue together yourself.",
    features: [
      {
        Icon: IconDashboard,
        title: "Everything in Starter, across your whole portfolio",
        desc: "All Starter capabilities — AI reply, qualification, tour booking, conversation dashboard, occupancy intelligence — extended across up to 20 properties with per-property AI personas, specials, and unit availability.",
      },
      {
        Icon: IconBuilding,
        title: "Portfolio dashboard",
        desc: "All your properties at a glance with side-by-side KPIs: response time, tour rate, application starts, conversion. Spot the property that's underperforming before your owner does.",
      },
      {
        Icon: IconRefresh,
        title: "Tenant retention layer",
        desc: "Automated renewal outreach 90 / 60 / 30 days before lease end, satisfaction check-ins mid-lease, and AI-assisted negotiation flows. Catch rolloff risk before it becomes a vacancy.",
      },
      {
        Icon: IconChart,
        title: "AI-generated owner reports",
        desc: "Weekly and monthly performance reports auto-generated and emailed to the owners of each property. Includes leases signed, conversion trends, and forecast — all written in plain English.",
      },
      {
        Icon: IconTarget,
        title: "Competitor rent tracking",
        desc: "Monitors comparable rents in your sub-market and surfaces alerts when your asking rent drifts above or below the comp set. Built for ops teams who need to defend pricing decisions to ownership.",
      },
      {
        Icon: IconPlug,
        title: "Lead source integrations",
        desc: "Pre-built webhooks for Zillow, Apartments.com, AppFolio, Facebook Lead Ads, and HubSpot CRM. No engineering required. Add a new lead source in under five minutes.",
      },
      {
        Icon: IconHandshake,
        title: "Priority onboarding",
        desc: "A dedicated setup specialist handles your account configuration, AI persona tuning, and integration wiring. First conversation live within 24 hours of signup.",
      },
    ],
    bestFor:
      "Regional property managers, multi-property owners, and small management companies who've outgrown a spreadsheet but aren't ready for enterprise software.",
    cta: { label: "Start 14-Day Pilot", href: "/free-trial?plan=pro" },
  },
  {
    id: "portfolio",
    name: "Portfolio",
    audience: "For Enterprise Management",
    range: "20+ properties · 1,000+ units",
    tagline: "Custom AI behavior across your entire portfolio.",
    promise:
      "At enterprise scale, off-the-shelf doesn't fit. Portfolio is the plan when you need a per-property persona, a real SLA, an API your engineers can build into, and a named human you can call.",
    features: [
      {
        Icon: IconBuilding,
        title: "Everything in Pro, unlimited properties",
        desc: "All Pro capabilities — portfolio dashboard, tenant retention, owner reports, competitor tracking, integrations — extended to unlimited properties, unlimited users, unlimited concurrent conversations.",
      },
      {
        Icon: IconHandshake,
        title: "Dedicated account manager",
        desc: "A named senior account manager assigned to your account. Weekly check-ins, escalation path for ops issues, and direct line to the founding team for product feedback or roadmap input.",
      },
      {
        Icon: IconTarget,
        title: "Custom AI prompt configuration",
        desc: "We tune the AI's tone, vocabulary, persona, and qualification criteria per property — or per region. Your luxury high-rise in Uptown Dallas doesn't sound like your workforce housing community in Houston, and it shouldn't.",
      },
      {
        Icon: IconChart,
        title: "White-label reporting",
        desc: "Owner reports go out under your management company's branding, not ours. Custom logo, color palette, signature line. Ownership groups never know there's an AI in the loop unless you choose to tell them.",
      },
      {
        Icon: IconPlug,
        title: "API access",
        desc: "Full REST API + webhooks so your engineering team can integrate LeaseUp Bulldog into your existing tech stack — Yardi, RealPage, custom CRMs, BI dashboards. We provide docs, SDKs, and engineering support.",
      },
      {
        Icon: IconShield,
        title: "SLA guarantees",
        desc: "99.9% uptime SLA with credits for downtime. 1-hour critical-issue response window during business hours. Quarterly security and SOC 2 documentation reviews available on request.",
      },
      {
        Icon: IconLifebuoy,
        title: "Quarterly strategy reviews",
        desc: "Founder-led strategic planning sessions four times a year — in-person or Zoom. Roadmap alignment, custom feature requests, market expansion planning. We treat Portfolio customers like partners.",
      },
    ],
    bestFor:
      "Enterprise management companies, REITs, and large multifamily operators with 1,000+ units across multiple markets who need custom configuration, an SLA, and an API.",
    cta: { label: "Talk to Sales", href: "/contact" },
  },
];

// Comparison matrix — every row checked off across the 3 plans (no prices, no $$$).
type MatrixRow = { feature: string; starter: boolean; pro: boolean; portfolio: boolean };
const MATRIX: MatrixRow[] = [
  { feature: "AI SMS reply in under 60 seconds", starter: true, pro: true, portfolio: true },
  { feature: "Automatic lead qualification", starter: true, pro: true, portfolio: true },
  { feature: "Tour scheduling on autopilot", starter: true, pro: true, portfolio: true },
  { feature: "Conversation dashboard with manual takeover", starter: true, pro: true, portfolio: true },
  { feature: "Occupancy intelligence per property", starter: true, pro: true, portfolio: true },
  { feature: "Fair Housing & TCPA guardrails", starter: true, pro: true, portfolio: true },
  { feature: "Properties supported", starter: false, pro: false, portfolio: false }, // text-only row, handled separately
  { feature: "Portfolio dashboard with side-by-side KPIs", starter: false, pro: true, portfolio: true },
  { feature: "Tenant retention & renewal outreach", starter: false, pro: true, portfolio: true },
  { feature: "AI-generated owner reports", starter: false, pro: true, portfolio: true },
  { feature: "Competitor rent tracking", starter: false, pro: true, portfolio: true },
  { feature: "Lead source integrations (Zillow, AppFolio, etc.)", starter: false, pro: true, portfolio: true },
  { feature: "Priority onboarding", starter: false, pro: true, portfolio: true },
  { feature: "Dedicated account manager", starter: false, pro: false, portfolio: true },
  { feature: "Custom AI prompt configuration per property", starter: false, pro: false, portfolio: true },
  { feature: "White-label reporting", starter: false, pro: false, portfolio: true },
  { feature: "API access", starter: false, pro: false, portfolio: true },
  { feature: "SLA guarantees (99.9% uptime, 1hr response)", starter: false, pro: false, portfolio: true },
  { feature: "Quarterly strategy reviews", starter: false, pro: false, portfolio: true },
];

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">
      <MarketingNav />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-20 pt-24 text-center">
        <PageBackground variant="hero" />
        <div className="relative mx-auto max-w-3xl">
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#C8102E]/40 bg-[#C8102E]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#F87171] backdrop-blur-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C8102E] pulse-dot" />
              The Product
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mb-6 text-5xl font-black leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
              Three plans.<br />
              <span className="text-[#C8102E]">Built for every stage</span><br />
              of your portfolio.
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-lg font-medium text-gray-300 leading-relaxed">
              From your first property to your thousandth. Same product. Different scope. Pick the plan that fits the operator you are today — upgrade when you outgrow it.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Quick overview row ────────────────────────────────────────────── */}
      <section className="relative border-y border-[#1E1E2E] bg-[#10101A] px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((p, i) => (
              <Reveal key={p.id} delay={i * 100}>
                <a
                  href={`#${p.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-[#1E1E2E] bg-[#08080F] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#C8102E]/60 hover:shadow-[0_0_40px_rgba(200,16,46,0.2)]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F87171]">{p.name}</span>
                    {p.id === "pro" && (
                      <span className="rounded-full bg-[#C8102E]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#F87171]">
                        Most Popular
                      </span>
                    )}
                  </div>
                  <p className="mb-1 text-lg font-bold text-white">{p.audience}</p>
                  <p className="mb-4 text-sm text-gray-400">{p.range}</p>
                  <p className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-gray-500 group-hover:text-[#F87171] transition-colors">
                    See what&apos;s included <IconArrowRight size={12} />
                  </p>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three plan deep-dives ─────────────────────────────────────────── */}
      {PLANS.map((plan, planIdx) => (
        <section
          key={plan.id}
          id={plan.id}
          className="relative scroll-mt-20 px-6 py-32"
          style={{
            background: planIdx % 2 === 1 ? "#0A0A12" : "transparent",
          }}
        >
          {/* Subtle plan-anchor glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[700px] -translate-x-1/2 rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(200,16,46,0.08) 0%, transparent 70%)", filter: "blur(60px)" }}
          />

          <div className="relative mx-auto max-w-6xl">

            {/* Section header */}
            <Reveal className="mb-16 max-w-3xl">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C8102E]">── Plan {planIdx + 1} of 3</span>
                <span className="rounded-full border border-[#1E1E2E] bg-[#16161F] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {plan.range}
                </span>
              </div>
              <h2 className="mb-4 text-4xl font-black leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                <span className="text-white">{plan.name}</span>
                <span className="text-[#C8102E]"> — {plan.audience}</span>
              </h2>
              <p className="text-2xl font-medium leading-snug text-white">{plan.tagline}</p>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-400">{plan.promise}</p>
            </Reveal>

            {/* Feature deep-dives */}
            <div className="grid gap-5 md:grid-cols-2">
              {plan.features.map((feat, fi) => (
                <Reveal key={feat.title} delay={(fi % 2) * 80}>
                  <div className="group flex h-full gap-5 rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#C8102E]/50 hover:shadow-[0_0_30px_rgba(200,16,46,0.15)]">
                    <div className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/10 text-[#F87171]">
                      <feat.Icon />
                    </div>
                    <div>
                      <h3 className="mb-2 text-base font-bold text-white">{feat.title}</h3>
                      <p className="text-sm leading-relaxed text-gray-400">{feat.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Best for + CTA row */}
            <Reveal delay={150}>
              <div className="mt-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-center rounded-2xl border border-[#C8102E]/30 bg-gradient-to-br from-[#10101A] to-[#1A0A0F] p-6">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#F87171]">Best for</p>
                  <p className="text-base leading-relaxed text-gray-200">{plan.bestFor}</p>
                </div>
                <Link
                  href={plan.cta.href}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#C8102E] px-6 py-3 text-sm font-bold text-white whitespace-nowrap transition-all hover:scale-105"
                  style={{ boxShadow: "0 0 25px rgba(200,16,46,0.5)" }}
                >
                  {plan.cta.label} <IconArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      ))}

      {/* ── Comparison matrix ─────────────────────────────────────────────── */}
      <section className="relative border-y border-[#1E1E2E] bg-[#10101A] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-12 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C8102E]">── Compare all features</span>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Side by side,<br />
              <span className="text-[#C8102E]">no surprises.</span>
            </h2>
            <p className="mt-4 text-base font-medium leading-relaxed text-gray-300">
              Every feature, every plan. Pricing lives on a separate page so you can compare what you&apos;re actually getting first.
            </p>
          </Reveal>

          <Reveal>
            <div className="overflow-x-auto rounded-2xl border border-[#1E1E2E] bg-[#08080F]">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[#1E1E2E]">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Feature</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-300">Starter</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#F87171]">Pro</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-300">Portfolio</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Properties supported row — text instead of checkmarks */}
                  <tr className="border-b border-[#1E1E2E]/50 bg-[#10101A]/30">
                    <td className="px-6 py-3.5 font-medium text-white">Properties supported</td>
                    <td className="px-6 py-3.5 text-center text-gray-300">1–3</td>
                    <td className="px-6 py-3.5 text-center text-[#F87171] font-semibold">4–20</td>
                    <td className="px-6 py-3.5 text-center text-gray-300">Unlimited</td>
                  </tr>
                  {MATRIX.filter((r) => r.feature !== "Properties supported").map((row) => (
                    <tr key={row.feature} className="border-b border-[#1E1E2E]/50 transition-colors hover:bg-[#10101A]/50 last:border-0">
                      <td className="px-6 py-3.5 text-gray-300">{row.feature}</td>
                      <td className="px-6 py-3.5 text-center">
                        {row.starter ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#C8102E]/15 text-[#F87171]"><IconCheck size={12} /></span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {row.pro ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#C8102E]/15 text-[#F87171]"><IconCheck size={12} /></span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {row.portfolio ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#C8102E]/15 text-[#F87171]"><IconCheck size={12} /></span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Decision helper ───────────────────────────────────────────────── */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-12 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C8102E]">── Not sure which plan?</span>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Quick decision<br />
              <span className="text-[#C8102E]">helper.</span>
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                question: "Have 1–3 properties and run them yourself?",
                answer: "Starter",
                desc: "You'll get every after-hours lead replied to in 60 seconds without hiring weekend coverage.",
                href: "#starter",
              },
              {
                question: "Manage 4–20 properties across a region?",
                answer: "Pro",
                desc: "You need portfolio-wide visibility and owner reports without engineering effort.",
                href: "#pro",
              },
              {
                question: "20+ properties, multiple markets, custom needs?",
                answer: "Portfolio",
                desc: "You need an SLA, an API, and a named account manager. Off-the-shelf doesn't fit.",
                href: "#portfolio",
              },
            ].map((d, i) => (
              <Reveal key={d.answer} delay={i * 100}>
                <a
                  href={d.href}
                  className="group block h-full rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#C8102E]/60 hover:shadow-[0_0_40px_rgba(200,16,46,0.2)]"
                >
                  <p className="mb-4 text-sm font-medium leading-relaxed text-gray-300">{d.question}</p>
                  <p className="mb-3 text-3xl font-black tracking-tight text-[#C8102E]">{d.answer}</p>
                  <p className="text-sm leading-relaxed text-gray-400">{d.desc}</p>
                </a>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10 text-center">
            <p className="text-sm text-gray-400">
              Want to see what each plan costs?{" "}
              <Link href="/pricing" className="font-semibold text-[#F87171] hover:text-white transition-colors">
                See pricing →
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── How it works hand-off ─────────────────────────────────────────── */}
      <section className="relative border-y border-[#1E1E2E] bg-[#10101A] px-6 py-16">
        <Reveal className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#C8102E]">── Curious about the workflow?</p>
          <h3 className="mb-4 text-2xl font-black tracking-tight md:text-3xl">
            See exactly how a lead becomes a lease.
          </h3>
          <p className="mx-auto mb-6 max-w-xl text-base leading-relaxed text-gray-400">
            All three plans share the same five-step lifecycle — only the scope and customization changes.
          </p>
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#F87171] hover:text-white transition-colors"
          >
            See How It Works <IconArrowRight size={14} />
          </Link>
        </Reveal>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-32 text-center">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(200,16,46,0.18) 0%, transparent 60%)" }} />
        <Reveal className="relative mx-auto max-w-3xl">
          <h2 className="mb-6 text-5xl font-black leading-[0.95] tracking-tight md:text-6xl">
            Ready to pick<br />
            your <span className="text-[#C8102E]">plan?</span>
          </h2>
          <p className="mb-10 text-lg font-medium leading-relaxed text-gray-300">
            14-day free trial on Starter and Pro. Custom contract on Portfolio. We&apos;ll set up your first property with you on a 15-minute call.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/free-trial"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#C8102E] px-8 py-4 text-base font-bold text-white transition-all hover:scale-105"
              style={{ boxShadow: "0 0 40px rgba(200,16,46,0.5)" }}
            >
              Start Free Trial <IconArrowRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#1E1E2E] bg-[#16161F] px-8 py-4 text-base font-semibold text-white transition-colors hover:border-white"
            >
              View Pricing
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#1E1E2E] bg-[#16161F] px-8 py-4 text-base font-semibold text-white transition-colors hover:border-white"
            >
              Talk to Sales
            </Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
