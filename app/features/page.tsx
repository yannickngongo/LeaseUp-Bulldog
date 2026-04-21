import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

const FEATURES = [
  {
    icon: "⚡",
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
    icon: "🎯",
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
    icon: "🔁",
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
    icon: "📊",
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
    icon: "🗓️",
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
    icon: "📱",
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
    icon: "🏢",
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
    icon: "🔐",
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
    icon: "🔌",
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
      <section className="relative overflow-hidden px-6 pb-16 pt-20 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-[#C8102E]/10 blur-[100px]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#C8102E]">Features</p>
          <h1 className="mb-6 text-5xl font-black tracking-tight md:text-6xl">
            Everything you need to<br />
            <span className="text-[#C8102E]">dominate lease-up.</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            From the moment a lead comes in to the day they sign — LeaseUp Bulldog handles the hard parts automatically.
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="group rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-7 transition-colors hover:border-[#C8102E]/40"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#C8102E]/10 text-2xl">
                  {feat.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{feat.title}</h3>
                <p className="mb-5 text-sm leading-relaxed text-gray-500">{feat.desc}</p>
                <ul className="space-y-2">
                  {feat.detail.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="mt-0.5 shrink-0 text-[#C8102E]">✓</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-[#10101A] border-y border-[#1E1E2E] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C8102E]">Pricing</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Simple. Performance-based.</h2>
            <p className="mt-3 text-gray-500">Start at $500/mo. Pay per lease only when we deliver.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            {[
              { name: "Starter", price: "$500", lease: "$150", range: "1–3 properties", popular: false },
              { name: "Pro",     price: "$1,500", lease: "$200", range: "4–20 properties", popular: true },
              { name: "Portfolio", price: "$3,000", lease: "$250", range: "20+ properties", popular: false },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl border p-6 flex flex-col ${plan.popular ? "border-[#C8102E] bg-[#C8102E]/5 relative" : "border-[#1E1E2E] bg-[#16161F]"}`}>
                {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#C8102E] px-3 py-1 text-[10px] font-black text-white tracking-widest uppercase">Most Popular</span>}
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${plan.popular ? "text-[#C8102E]" : "text-gray-500"}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mb-0.5">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="mb-1 text-sm text-gray-400">/mo</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">+ {plan.lease}/lease signed</p>
                <p className="text-sm text-gray-400 mb-4">{plan.range}</p>
                <Link href="/free-trial" className={`mt-auto block w-full rounded-xl py-2.5 text-center text-sm font-bold transition-colors ${plan.popular ? "bg-[#C8102E] text-white hover:bg-[#A50D25] shadow-lg shadow-[#C8102E]/25" : "border border-[#1E1E2E] text-white hover:bg-white/5"}`}>
                  Start Pilot →
                </Link>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-amber-400">Marketing Add-On</p>
                <span className="rounded-full border border-amber-800/40 bg-amber-900/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">Optional</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-black text-white">$500</span>
                <span className="text-sm text-gray-400">/mo</span>
                <span className="text-sm text-gray-500">+</span>
                <span className="text-2xl font-black text-white">5%</span>
                <span className="text-sm text-gray-400">of ad spend</span>
              </div>
              <p className="text-sm text-gray-400">AI ad strategy, creative, and copy for Facebook & Google.</p>
            </div>
            <div className="shrink-0 rounded-xl border border-amber-800/30 bg-amber-900/20 p-4 text-center min-w-[140px]">
              <p className="text-xs text-amber-400 font-semibold mb-1">Example: $5K spend</p>
              <p className="text-xl font-black text-white">$750/mo</p>
              <p className="text-xs text-gray-500">$500 + $250 (5%)</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-600">No setup fee · 14-day pilot · 30-day results guarantee · <Link href="/pricing" className="text-[#C8102E] hover:underline">Full pricing details →</Link></p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-6 py-20 text-center">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[600px] rounded-full bg-[#C8102E]/10 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-2xl">
          <h2 className="mb-6 text-4xl font-black tracking-tight">
            Ready to put it all to work?
          </h2>
          <p className="mb-8 text-gray-400">Start your 14-day pilot — $1,000 setup, no platform fee during trial. $200/lease only when we deliver.</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/free-trial"
              className="rounded-xl bg-[#C8102E] px-8 py-4 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors shadow-lg shadow-[#C8102E]/25"
            >
              Start Free Trial →
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-[#1E1E2E] px-8 py-4 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
