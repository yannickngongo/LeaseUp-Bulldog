import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { PricingPageWaitlist } from "@/components/marketing-addon/PricingPageWaitlist";
import { isMarketingAddonLive } from "@/lib/feature-flags";
import { Reveal } from "@/components/marketing/Reveal";
import { PageBackground } from "@/components/marketing/PageBackground";

const FAQS = [
  {
    q: "Is there a setup fee?",
    a: "No. We eliminated the setup fee. You pay your first month's platform fee and you're live. Onboarding, Twilio provisioning, AI configuration, and the team walkthrough are all included.",
  },
  {
    q: "What does the platform fee include?",
    a: "Everything — AI lead qualification, automated SMS follow-up, human takeover, conversation dashboard, calendar, occupancy intelligence, campaign tools, and priority support.",
  },
  {
    q: "How does the per-lease performance fee work?",
    a: "You pay a per-lease fee for every lease signed through LUB within 30 days of first AI contact. The fee decreases as you grow: $200 on Starter, $150 on Pro, and $100 on Portfolio. We only charge you when we deliver a result.",
  },
  {
    q: "What is the Marketing Add-On?",
    a: "For $500/month + 5% of your ad spend, our AI generates ad strategy, headlines, and copy for Facebook and Google. You approve everything before it goes live. Leads flow directly into your LUB pipeline.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — 14-day pilot, no platform fee during trial. You only pay the first month upfront, which is credited toward your subscription if you continue. If LUB doesn't qualify 20+ leads in your first 30 days, we refund your first month.",
  },
  {
    q: "What counts as a LUB-attributed lease?",
    a: "Any lead that received an AI message through LUB and signed a lease within 30 days of first contact. Attribution is tracked automatically with a full audit trail.",
  },
];

function Check() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-[#C8102E]">
      <path d="M3 8l3.5 3.5L13 4" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-12 pt-16 text-center md:pb-16 md:pt-24">
        <PageBackground variant="hero" />
        <div className="relative mx-auto max-w-3xl">
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#C8102E]/40 bg-[#C8102E]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#F87171] backdrop-blur-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C8102E] pulse-dot" />
              Pricing
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mb-6 text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Simple.<br />
              <span className="text-[#C8102E]">Performance-based.</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-lg font-medium text-gray-300 leading-relaxed">
              Start at $500/mo. Pay per lease only when we deliver. No setup fee. No lock-in.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Tier cards */}
      <section className="relative px-6 pb-20">
        <div className="mx-auto max-w-5xl">

          <Reveal className="grid gap-4 md:grid-cols-3 mb-6">
            {/* Starter */}
            <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[#C8102E]/40 hover:shadow-[0_0_30px_rgba(200,16,46,0.15)]">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Starter</p>
              <div className="mb-1 flex items-end gap-1">
                <span className="text-4xl font-black text-white">$500</span>
                <span className="mb-1 text-sm text-gray-400">/mo</span>
              </div>
              <p className="text-xs text-gray-500 mb-1">+ $200/lease signed</p>
              <p className="text-sm text-gray-400 mb-5">1–3 properties. Independent landlords and small operators.</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  "Up to 3 properties",
                  "Unlimited leads",
                  "AI SMS qualification & follow-up",
                  "Human takeover & escalation",
                  "Conversation dashboard",
                  "Occupancy intelligence",
                  "14-day pilot included",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300"><Check /> {f}</li>
                ))}
              </ul>
              <Link href="/free-trial" className="block w-full rounded-xl border border-[#1E1E2E] py-3 text-center text-sm font-bold text-white hover:bg-white/5 transition-colors">
                Start Pilot →
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border border-[#C8102E] bg-[#C8102E]/5 p-8 flex flex-col relative transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_50px_rgba(200,16,46,0.35)]">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#C8102E] px-3 py-1 text-[10px] font-black text-white tracking-widest uppercase">Most Popular</span>
              <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-1">Pro</p>
              <div className="mb-1 flex items-end gap-1">
                <span className="text-4xl font-black text-white">$1,500</span>
                <span className="mb-1 text-sm text-gray-400">/mo</span>
              </div>
              <p className="text-xs text-gray-400 mb-1">+ $150/lease signed</p>
              <p className="text-sm text-gray-400 mb-5">4–20 properties. Regional operators and property managers.</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  "Up to 20 properties",
                  "Everything in Starter",
                  "Portfolio overview dashboard",
                  "Tenant retention layer",
                  "AI-generated owner reports",
                  "Competitor rent tracking",
                  "Lead source integrations",
                  "Priority onboarding support",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300"><Check /> {f}</li>
                ))}
              </ul>
              <Link href="/free-trial" className="block w-full rounded-xl bg-[#C8102E] py-3 text-center text-sm font-bold text-white hover:bg-[#A50D25] transition-colors shadow-lg shadow-[#C8102E]/25">
                Start Pilot →
              </Link>
            </div>

            {/* Portfolio */}
            <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[#C8102E]/40 hover:shadow-[0_0_30px_rgba(200,16,46,0.15)]">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Portfolio</p>
              <div className="mb-1 flex items-end gap-1">
                <span className="text-4xl font-black text-white">$3,000</span>
                <span className="mb-1 text-sm text-gray-400">/mo</span>
              </div>
              <p className="text-xs text-gray-500 mb-1">+ $100/lease signed</p>
              <p className="text-sm text-gray-400 mb-5">20+ properties. Enterprise management companies.</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  "Unlimited properties",
                  "Everything in Pro",
                  "Dedicated account manager",
                  "Custom AI prompt configuration",
                  "White-label reporting",
                  "API access",
                  "SLA guarantees",
                  "Quarterly strategy reviews",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300"><Check /> {f}</li>
                ))}
              </ul>
              <Link href="/contact" className="block w-full rounded-xl border border-[#1E1E2E] py-3 text-center text-sm font-bold text-white hover:bg-white/5 transition-colors">
                Talk to Sales →
              </Link>
            </div>
          </Reveal>

          {/* Marketing Add-On */}
          <Reveal className="mb-6 rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#F87171]">Marketing Add-On</p>
                  {isMarketingAddonLive() ? (
                    <span className="rounded-full border border-[#C8102E]/40 bg-[#C8102E]/10 px-2 py-0.5 text-[10px] font-bold text-[#F87171]">Optional</span>
                  ) : (
                    <span className="rounded-full border border-[#1E1E2E] bg-[#16161F] px-2 py-0.5 text-[10px] font-bold text-gray-400">Coming Soon</span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-black text-white">$500</span>
                  <span className="text-sm text-gray-400">/mo</span>
                  <span className="text-sm text-gray-500">+</span>
                  <span className="text-3xl font-black text-white">5%</span>
                  <span className="text-sm text-gray-400">of ad spend</span>
                </div>
                <p className="text-sm text-gray-400">AI ad strategy, creative, and copy for Facebook & Google. You approve before anything goes live.</p>
              </div>
              {isMarketingAddonLive() ? (
                <div className="shrink-0">
                  <div className="rounded-xl border border-[#1E1E2E] bg-[#16161F] p-4 text-center min-w-[160px]">
                    <p className="text-xs text-[#F87171] font-semibold mb-1">Example: $5K ad spend</p>
                    <p className="text-2xl font-black text-white">$750/mo</p>
                    <p className="text-xs text-gray-500">$500 + $250 (5%)</p>
                  </div>
                </div>
              ) : (
                <PricingPageWaitlist />
              )}
            </div>
          </Reveal>

          {/* Performance fee callout */}
          <Reveal className="mb-6 rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Performance Fee — Only When We Deliver</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  You only pay the per-lease fee when a LUB-managed lead signs a lease within 30 days of first AI contact. Full attribution tracking, monthly invoice with breakdown. We don't win unless you win.
                </p>
              </div>
              <div className="rounded-xl border border-[#1E1E2E] p-4 text-center">
                <p className="text-xs text-gray-500 mb-2">Example: 5 leases on Pro</p>
                <p className="text-2xl font-black text-white">$2,500</p>
                <p className="text-xs text-gray-500">$1,500 platform + $1,000 perf.</p>
              </div>
            </div>
          </Reveal>

          {/* 30-day guarantee */}
          <Reveal className="mb-8 rounded-2xl border border-[#C8102E]/30 bg-gradient-to-br from-[#10101A] to-[#1A0A0F] p-6 text-center">
            <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#C8102E]/40 bg-[#C8102E]/10 text-[#F87171]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <p className="text-lg font-black text-white mb-1">30-Day Results Guarantee</p>
            <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
              If LUB doesn&apos;t qualify at least 20 leads in your first 30 days, we refund your first month. No questions asked. We&apos;re that confident.
            </p>
          </Reveal>

          <div className="text-center">
            <Link href="/free-trial" className="inline-block rounded-xl bg-[#C8102E] px-10 py-4 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors shadow-lg shadow-[#C8102E]/25">
              Start 14-Day Pilot →
            </Link>
            <p className="mt-3 text-xs text-gray-600">No setup fee. Platform fee starts after pilot. Cancel anytime.</p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="border-t border-[#1E1E2E] px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-3xl font-black">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-[#1E1E2E] bg-[#10101A] p-6">
                <p className="mb-2 font-semibold text-white">{faq.q}</p>
                <p className="text-sm leading-relaxed text-gray-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-[#1E1E2E] px-6 py-20 text-center">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[600px] rounded-full bg-[#C8102E]/10 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-xl">
          <h2 className="mb-5 text-4xl font-black">Only pay when we deliver.</h2>
          <p className="mb-8 text-gray-400">$500/mo Starter · $1,500/mo Pro · $3,000/mo Portfolio · $100–$200 per lease signed.</p>
          <Link href="/free-trial" className="inline-block rounded-xl bg-[#C8102E] px-10 py-4 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors shadow-lg shadow-[#C8102E]/25">
            Start the Conversation →
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
