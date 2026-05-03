import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { IconBolt, IconTarget, IconRefresh, IconChart, IconCalendar, IconDashboard, IconBuilding, IconShield, IconPlug, IconCheck, IconArrowRight } from "@/components/marketing/Icons";
import { Reveal } from "@/components/marketing/Reveal";
import { PageBackground } from "@/components/marketing/PageBackground";
import type { ComponentType } from "react";

type Feat = { Icon: ComponentType<{ className?: string; size?: number }>; title: string; desc: string; detail: string[] };

const FEATURES: Feat[] = [
  {
    Icon: IconBolt,
    title: "Instant AI Response",
    desc: "Every new lead gets a personalized SMS reply in under 60 seconds — day or night, weekday or weekend. No leasing agent required.",
    detail: [
      "Triggered the moment a lead submits their info",
      "Personalized to source, property, and availability",
      "Sounds human — no robotic scripts",
      "Works on Zillow, Apartments.com, Facebook, and more",
    ],
  },
  {
    Icon: IconTarget,
    title: "Smart Lead Qualification",
    desc: "AI collects move-in date, unit type, budget, and pet info through natural SMS conversation — automatically, without forms.",
    detail: [
      "Asks one question at a time — feels conversational",
      "Extracts: move-in date, bedrooms, budget min/max, pets",
      "Handles fuzzy answers ('around $1,800' → budget recorded)",
      "Updates lead profile in real time",
    ],
  },
  {
    Icon: IconRefresh,
    title: "Automated Follow-Up Sequences",
    desc: "Leads that go quiet get a nudge. Sequences run on schedule so no prospect falls through the cracks.",
    detail: [
      "Day 1, Day 3, Day 7 follow-up cadence",
      "Context-aware — references prior conversation",
      "Stops automatically when lead responds",
      "Marks lead lost after configurable silence window",
    ],
  },
  {
    Icon: IconChart,
    title: "AI Lead Scoring",
    desc: "Every lead gets a 1–10 quality score so your team knows exactly who to prioritize.",
    detail: [
      "Score based on qualification completeness",
      "Hot / Warm / Cold labels for fast triage",
      "Visible in dashboard and lead detail view",
      "Updated every time new info comes in",
    ],
  },
  {
    Icon: IconCalendar,
    title: "Tour & Application Push",
    desc: "AI guides warm leads toward booking a tour or starting an application at exactly the right moment.",
    detail: [
      "Suggests tour times after qualification completes",
      "Handles objections with pre-built responses",
      "Logs tour status in your pipeline",
      "Application link sent automatically post-tour",
    ],
  },
  {
    Icon: IconDashboard,
    title: "Operator Dashboard",
    desc: "Full pipeline visibility — response times, tour rates, application starts, and conversion at a glance.",
    detail: [
      "KPI cards: response time, tours booked, app starts",
      "Lead table with filters by status, source, property",
      "Full conversation thread per lead",
      "Activity log for every AI and agent action",
    ],
  },
  {
    Icon: IconBuilding,
    title: "Multi-Property Management",
    desc: "Manage every community from one account. Each property gets its own phone number and AI persona.",
    detail: [
      "Unlimited properties on Growth and Portfolio plans",
      "Per-property specials surfaced in AI responses",
      "Separate lead pipelines per community",
      "Cross-property reporting in one view",
    ],
  },
  {
    Icon: IconShield,
    title: "Security & Compliance",
    desc: "Your data is encrypted in transit and at rest. TCPA-compliant opt-out handling built in.",
    detail: [
      "End-to-end encryption via Supabase + Twilio",
      "STOP keyword handling automatic",
      "Role-based access control for team members",
      "Audit trail for every AI action",
    ],
  },
  {
    Icon: IconPlug,
    title: "Integrations",
    desc: "Works alongside your existing tools. No rip-and-replace required.",
    detail: [
      "Twilio for SMS delivery",
      "Webhook support for any lead source",
      "Zapier-compatible (coming soon)",
      "CRM export via CSV or API",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-16 text-center md:pb-20 md:pt-24">
        <PageBackground variant="hero" />
        <div className="relative mx-auto max-w-3xl">
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#C8102E]/40 bg-[#C8102E]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#F87171] backdrop-blur-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C8102E] pulse-dot" />
              Features
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mb-6 text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Everything you need<br />
              to <span className="text-[#C8102E]">dominate</span> lease-up.
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-lg font-medium text-gray-300 leading-relaxed">
              From the moment a lead comes in to the day they sign — LeaseUp Bulldog handles the hard parts automatically.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Feature grid */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-10 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C8102E]">── Capabilities</span>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat, i) => (
              <Reveal key={feat.title} delay={(i % 3) * 100}>
                <div className="group h-full rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#C8102E]/60 hover:shadow-[0_0_40px_rgba(200,16,46,0.25),inset_0_0_20px_rgba(200,16,46,0.05)]">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/10 text-[#F87171]">
                    <feat.Icon />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-white">{feat.title}</h3>
                  <p className="mb-5 text-sm leading-relaxed text-gray-400">{feat.desc}</p>
                  <ul className="space-y-2">
                    {feat.detail.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-xs text-gray-400">
                        <span className="mt-0.5 shrink-0 text-[#C8102E]"><IconCheck size={12} /></span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — pricing now lives only on /pricing */}
      <section className="relative overflow-hidden px-6 py-20 text-center md:py-32">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(200,16,46,0.15) 0%, transparent 60%)" }} />
        <Reveal className="relative mx-auto max-w-3xl">
          <h2 className="mb-6 text-5xl font-black leading-[0.95] tracking-tight md:text-6xl">
            Ready to put it all<br />
            to <span className="text-[#C8102E]">work?</span>
          </h2>
          <p className="mb-10 text-lg font-medium leading-relaxed text-gray-300">
            Start your 14-day pilot — no setup fee, no platform fee during trial. Per-lease fee only when we deliver.
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
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
