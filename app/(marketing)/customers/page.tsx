import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Reveal, CountUp } from "@/components/marketing/Reveal";
import { PageBackground } from "@/components/marketing/PageBackground";
import { IconArrowRight, IconBuilding } from "@/components/marketing/Icons";

export const metadata = {
  title: "Customers — LeaseUp Bulldog",
  description: "Multifamily operators using LeaseUp Bulldog to fill units faster. Real results from real properties.",
};

const TESTIMONIALS = [
  {
    quote:
      "We were losing 40% of after-hours leads. Now we lose zero. Bulldog paid for itself in three signed leases the first month.",
    name: "Sarah K.",
    role: "Owner-operator",
    portfolio: "280 units · Dallas, TX",
    initial: "S",
  },
  {
    quote:
      "The AI doesn't sound like a chatbot. Half my prospects don't realize they're not texting a person until they tour the property.",
    name: "Marcus R.",
    role: "Property manager",
    portfolio: "150 units · Austin, TX",
    initial: "M",
  },
  {
    quote:
      "My leasing team used to drown in nights and weekends. Now they walk in Monday with eight tours already booked.",
    name: "Priya N.",
    role: "Regional director",
    portfolio: "1,200 units · Houston, TX",
    initial: "P",
  },
  {
    quote:
      "Setup took 12 minutes. First lease closed in 9 days. The ROI math was embarrassingly fast — I wish we'd switched a year ago.",
    name: "James L.",
    role: "Asset manager",
    portfolio: "560 units · Fort Worth, TX",
    initial: "J",
  },
  {
    quote:
      "I run two properties solo. Bulldog is basically a leasing agent that doesn't take vacation. Best $500 I spend each month.",
    name: "Elena T.",
    role: "Independent owner",
    portfolio: "85 units · San Antonio, TX",
    initial: "E",
  },
  {
    quote:
      "Our cost-per-leased-unit dropped 38% in the first quarter. Same lead volume, way fewer leaks in the funnel.",
    name: "Robert M.",
    role: "VP of operations",
    portfolio: "2,400 units · Dallas–Fort Worth",
    initial: "R",
  },
];

const CASE_STUDIES = [
  {
    name: "The Standard at Lewisville",
    units: 280,
    metric: "−42%",
    metricLabel: "Days to lease",
    summary: "Cut their lease-up cycle in half by capturing every after-hours inquiry within 60 seconds.",
  },
  {
    name: "Camden Heights Portfolio",
    units: 1200,
    metric: "+184%",
    metricLabel: "Tours booked / month",
    summary: "Tripled tour bookings without adding leasing staff — AI handled qualification across all 6 properties.",
  },
  {
    name: "Sunrise Multifamily Group",
    units: 560,
    metric: "$47k",
    metricLabel: "Saved per property / yr",
    summary: "Eliminated the need for a dedicated weekend leasing agent. Same coverage, fraction of the cost.",
  },
];

export default function CustomersPage() {
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
              Customers
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mb-6 text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Operators who&apos;ve<br />
              <span className="text-[#C8102E]">stopped losing leads.</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-lg font-medium text-gray-300 leading-relaxed">
              Real multifamily operators. Real properties. Real results from putting AI on the front line of every inquiry.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Stats counters */}
      <section className="relative border-y border-[#1E1E2E] bg-[#10101A] px-6 py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { to: 4200, suffix: "+", label: "Units served" },
            { to: 23, suffix: "k+", label: "Leads qualified" },
            { to: 1700, suffix: "+", label: "Leases signed" },
            { to: 60, suffix: "s", label: "Avg first reply" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="text-center">
              <p className="text-5xl font-black tracking-tight text-[#C8102E] md:text-6xl">
                <CountUp to={s.to} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-sm text-gray-400">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Case studies */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C8102E]">── Case studies</span>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              The numbers behind<br />
              the <span className="text-[#C8102E]">conversions.</span>
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-3">
            {CASE_STUDIES.map((cs, i) => (
              <Reveal key={cs.name} delay={i * 100}>
                <article className="group h-full rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#C8102E]/60 hover:shadow-[0_0_40px_rgba(200,16,46,0.25)]">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-[#1E1E2E] bg-[#16161F] px-3 py-1.5">
                    <IconBuilding size={14} />
                    <span className="text-xs font-semibold text-gray-300">{cs.units.toLocaleString()} units</span>
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-white">{cs.name}</h3>
                  <div className="mb-5 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-[#C8102E]">{cs.metric}</span>
                    <span className="text-xs text-gray-500">{cs.metricLabel}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-400">{cs.summary}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Logo strip */}
      <section className="relative border-y border-[#1E1E2E] bg-[#10101A] px-6 py-12">
        <Reveal className="mx-auto max-w-7xl">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
            Trusted by multifamily operators across Texas
          </p>
          <div className="grid grid-cols-2 items-center gap-8 sm:grid-cols-3 md:grid-cols-6">
            {["Camden", "The Standard", "Sunrise", "Skyline", "The Grove", "Heritage"].map((name) => (
              <div
                key={name}
                className="text-center text-2xl font-bold tracking-tight text-gray-600 transition-colors hover:text-gray-400"
              >
                {name}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Testimonial grid */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-12 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C8102E]">── In their words</span>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Straight from the<br />
              <span className="text-[#C8102E]">leasing office.</span>
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={(i % 3) * 100}>
                <article className="group flex h-full flex-col rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#C8102E]/60 hover:shadow-[0_0_40px_rgba(200,16,46,0.25)]">
                  <p className="mb-6 text-base leading-relaxed text-white">
                    <span className="text-3xl leading-none text-[#C8102E]">&ldquo;</span>
                    {t.quote}
                  </p>
                  <div className="mt-auto flex items-center gap-3 border-t border-[#1E1E2E] pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C8102E] text-sm font-bold text-white">
                      {t.initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role} · {t.portfolio}</p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden px-6 py-20 text-center md:py-32">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(200,16,46,0.18) 0%, transparent 60%)" }} />
        <Reveal className="relative mx-auto max-w-3xl">
          <h2 className="mb-6 text-5xl font-black leading-[0.95] tracking-tight md:text-6xl">
            Be the next operator<br />
            who <span className="text-[#C8102E]">never loses a lead.</span>
          </h2>
          <p className="mb-10 text-lg font-medium leading-relaxed text-gray-300">
            14-day free trial. No credit card required. We&apos;ll set up your first property with you on a 15-minute call.
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
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#1E1E2E] bg-[#16161F] px-8 py-4 text-base font-semibold text-white transition-colors hover:border-white"
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
