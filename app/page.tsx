import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

// Brand tokens: #C8102E red | #08080F bg | #10101A mid | #16161F surface | #1E1E2E border

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">

      <MarketingNav />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20">
        {/* Background glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/4 h-[600px] w-[900px] rounded-full bg-[#C8102E]/10 blur-[120px]" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C8102E]/30 bg-[#C8102E]/10 px-4 py-1.5 text-xs font-medium text-[#F87171]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C8102E] animate-pulse" />
            AI-powered leasing — respond in under 60 seconds
          </div>

          <h1 className="mb-6 text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
            Fill Your Apartments
            <br />
            <span className="text-[#C8102E]">Faster Than Ever.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-400 md:text-xl">
            LeaseUp Bulldog responds to every lead instantly, qualifies them with AI,
            and pushes them toward a tour — automatically. No more missed leads. No more slow follow-ups.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/free-trial"
              className="w-full sm:w-auto rounded-xl bg-[#C8102E] px-8 py-4 text-base font-bold text-white hover:bg-[#A50D25] transition-colors shadow-lg shadow-[#C8102E]/25"
            >
              Start Free Trial →
            </Link>
            <Link
              href="/how-it-works"
              className="w-full sm:w-auto rounded-xl border border-[#1E1E2E] bg-[#16161F] px-8 py-4 text-base font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
            >
              See How It Works
            </Link>
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className="mx-auto mt-20 max-w-5xl">
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-1 shadow-2xl shadow-black/60">
            <div className="rounded-xl border border-[#1E1E2E] bg-[#16161F] p-6">
              {/* Fake browser bar */}
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                <div className="h-3 w-3 rounded-full bg-[#28C840]" />
                <div className="ml-4 flex-1 rounded bg-[#1E1E2E] px-3 py-1 text-xs text-gray-500">
                  app.leaseupbulldog.com/dashboard
                </div>
              </div>

              {/* Mock dashboard content */}
              <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
                {[
                  { label: "Total Leads", value: "148" },
                  { label: "Avg Response", value: "0:47s" },
                  { label: "Tours Booked", value: "31" },
                  { label: "Leased", value: "12" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-[#1E1E2E] bg-[#10101A] p-3">
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="mt-1 text-xl font-bold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-[#1E1E2E] bg-[#10101A] overflow-hidden">
                <div className="grid grid-cols-5 border-b border-[#1E1E2E] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <span>Name</span><span>Source</span><span>Status</span><span>Move Date</span><span>Last Contact</span>
                </div>
                {[
                  { name: "Jordan Ellis", source: "Zillow", status: "Engaged", statusColor: "text-violet-400 bg-violet-400/10", date: "Aug 1", contact: "2m ago" },
                  { name: "Maya Thompson", source: "Website", status: "New", statusColor: "text-gray-400 bg-gray-400/10", date: "Jul 15", contact: "Just now" },
                  { name: "Carlos Reyes", source: "Apts.com", status: "Tour Scheduled", statusColor: "text-amber-400 bg-amber-400/10", date: "Sep 1", contact: "1h ago" },
                ].map((row) => (
                  <div key={row.name} className="grid grid-cols-5 border-b border-[#1E1E2E]/50 px-4 py-2.5 text-sm last:border-0">
                    <span className="font-medium text-white">{row.name}</span>
                    <span className="text-gray-500">{row.source}</span>
                    <span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.statusColor}`}>{row.status}</span>
                    </span>
                    <span className="text-gray-500">{row.date}</span>
                    <span className="text-gray-500">{row.contact}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <section className="border-y border-[#1E1E2E] bg-[#10101A] px-6 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { value: "<60s", label: "Average response time" },
            { value: "3×", label: "More tours booked" },
            { value: "98%", label: "Lead coverage rate" },
            { value: "24/7", label: "Always-on AI agent" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-black text-[#C8102E]">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem / Solution ──────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-2">

            {/* The Old Way */}
            <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-600">The Old Way</p>
              <h3 className="mb-6 text-xl font-bold text-white">Leads fall through the cracks</h3>
              <ul className="space-y-3">
                {[
                  "Leads wait hours — or days — for a reply",
                  "Leasing agents manually follow up on dozens of threads",
                  "Voicemails go unreturned, texts get missed",
                  "No visibility into which leads are worth chasing",
                  "Occupancy drops while pipeline sits idle",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="mt-0.5 shrink-0 text-gray-600">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* The New Way */}
            <div className="rounded-2xl border border-[#C8102E]/30 bg-[#C8102E]/5 p-8">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#C8102E]">With LeaseUp Bulldog</p>
              <h3 className="mb-6 text-xl font-bold text-white">Every lead gets a response in under 60 seconds</h3>
              <ul className="space-y-3">
                {[
                  "AI texts every new lead the moment they come in",
                  "Qualifies move-in date, budget, and unit type automatically",
                  "Follows up on cold leads without lifting a finger",
                  "Scores every lead so agents know where to focus",
                  "Books tours and drives applications 24/7",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className="mt-0.5 shrink-0 text-[#C8102E]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="bg-[#10101A] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C8102E]">Features</p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Everything you need to<br />
              <span className="text-[#C8102E]">dominate lease-up.</span>
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "⚡",
                title: "Instant AI Response",
                desc: "Every new lead gets a personalized SMS reply in under 60 seconds — day or night, weekday or weekend.",
              },
              {
                icon: "🎯",
                title: "Smart Qualification",
                desc: "AI collects move-in date, unit type, budget, and pet info through natural conversation — no forms required.",
              },
              {
                icon: "🔁",
                title: "Automated Follow-Up",
                desc: "Leads that go cold get a nudge. Sequences run on schedule so no prospect falls through the cracks.",
              },
              {
                icon: "📊",
                title: "Lead Scoring",
                desc: "Every lead gets an AI quality score so your team knows exactly who to call first.",
              },
              {
                icon: "🗓️",
                title: "Tour Scheduling",
                desc: "AI guides warm leads toward booking a tour or starting an application at exactly the right moment.",
              },
              {
                icon: "📱",
                title: "Operator Dashboard",
                desc: "Full pipeline visibility — response times, tour rates, application starts, and conversion at a glance.",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="group rounded-2xl border border-[#1E1E2E] bg-[#16161F] p-6 transition-colors hover:border-[#C8102E]/40"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#C8102E]/10 text-xl">
                  {feat.icon}
                </div>
                <h3 className="mb-2 font-bold text-white">{feat.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C8102E]">How It Works</p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Set up in minutes.<br />
              <span className="text-[#C8102E]">Convert for months.</span>
            </h2>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-[calc(50%-1px)] top-10 hidden h-[calc(100%-80px)] w-0.5 bg-gradient-to-b from-[#C8102E]/60 via-[#C8102E]/20 to-transparent md:block" />

            <div className="space-y-10">
              {[
                {
                  step: "01",
                  title: "Connect your properties",
                  desc: "Add your properties and assign each one a dedicated Twilio phone number. Leads from any source — Zillow, Apartments.com, your website — all funnel in.",
                },
                {
                  step: "02",
                  title: "Bulldog responds instantly",
                  desc: "The moment a lead comes in, our AI texts them a warm, human-sounding reply. It qualifies their move-in date, budget, and unit type — all through natural SMS conversation.",
                },
                {
                  step: "03",
                  title: "You close the deal",
                  desc: "Qualified leads are scored, tagged, and surfaced in your dashboard ready for a tour. Your team focuses on warm prospects — Bulldog handles the rest.",
                },
              ].map((step, i) => (
                <div key={step.step} className={`flex gap-8 ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} flex-col`}>
                  <div className="flex-1 rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8">
                    <p className="mb-3 text-4xl font-black text-[#C8102E]/30">{step.step}</p>
                    <h3 className="mb-3 text-xl font-bold text-white">{step.title}</h3>
                    <p className="text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="hidden md:flex w-10 shrink-0 items-center justify-center">
                    <div className="h-4 w-4 rounded-full border-2 border-[#C8102E] bg-[#08080F]" />
                  </div>
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-[#10101A] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C8102E]">Pricing</p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Simple, honest pricing.
            </h2>
            <p className="mt-4 text-gray-500">Pay per property. Cancel anytime.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Starter",
                price: "$199",
                period: "/mo per property",
                desc: "For operators with 1–2 properties getting started with AI leasing.",
                features: ["1 property", "Unlimited leads", "AI SMS responses", "Lead qualification", "Basic dashboard"],
                cta: "Start Free Trial",
                highlight: false,
              },
              {
                name: "Growth",
                price: "$399",
                period: "/mo per property",
                desc: "For active operators running 3–10 properties with a full pipeline.",
                features: ["Up to 10 properties", "Everything in Starter", "Automated follow-ups", "Lead scoring", "Tour tracking", "Priority support"],
                cta: "Start Free Trial",
                highlight: true,
              },
              {
                name: "Portfolio",
                price: "Custom",
                period: "",
                desc: "For institutional operators managing 10+ communities.",
                features: ["Unlimited properties", "Everything in Growth", "Custom integrations", "Dedicated account manager", "SLA guarantee"],
                cta: "Contact Sales",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${
                  plan.highlight
                    ? "border-[#C8102E] bg-[#C8102E]/5"
                    : "border-[#1E1E2E] bg-[#16161F]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#C8102E] px-4 py-1 text-xs font-bold text-white">
                    Most Popular
                  </div>
                )}
                <p className="mb-1 font-semibold text-gray-400">{plan.name}</p>
                <div className="mb-1 flex items-end gap-1">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  {plan.period && <span className="mb-1 text-sm text-gray-500">{plan.period}</span>}
                </div>
                <p className="mb-6 text-sm text-gray-500">{plan.desc}</p>

                <ul className="mb-8 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <span className="text-[#C8102E]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.name === "Portfolio" ? "/contact" : "/free-trial"}
                  className={`block w-full rounded-xl py-3 text-center text-sm font-bold transition-colors ${
                    plan.highlight
                      ? "bg-[#C8102E] text-white hover:bg-[#A50D25]"
                      : "border border-[#1E1E2E] text-gray-300 hover:border-gray-500 hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C8102E]">Results</p>
            <h2 className="text-4xl font-black tracking-tight">
              Operators love it.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                quote: "We went from responding to leads in 4 hours to under a minute. Tour bookings doubled in the first month.",
                name: "Marcus T.",
                role: "Portfolio Manager · 6 Properties",
              },
              {
                quote: "My leasing agents now only talk to warm, qualified leads. The AI handles everything else and it sounds exactly like a human.",
                name: "Sandra R.",
                role: "Owner Operator · Las Vegas",
              },
              {
                quote: "Occupancy was at 82% when I started. 90 days later we hit 97%. LeaseUp Bulldog changed how I think about lead conversion.",
                name: "David K.",
                role: "Regional Manager · 12 Communities",
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-7">
                <p className="mb-2 text-2xl text-[#C8102E]">&ldquo;</p>
                <p className="mb-6 text-sm leading-relaxed text-gray-300">{t.quote}</p>
                <div>
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-28">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[800px] rounded-full bg-[#C8102E]/10 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-4xl font-black tracking-tight md:text-6xl">
            Stop losing leads.<br />
            <span className="text-[#C8102E]">Start closing deals.</span>
          </h2>
          <p className="mb-10 text-lg text-gray-400">
            Join operators who never miss a lead. Start your 14-day free trial — no credit card required.
          </p>
          <Link
            href="/free-trial"
            className="inline-flex items-center gap-2 rounded-xl bg-[#C8102E] px-10 py-4 text-base font-bold text-white hover:bg-[#A50D25] transition-colors shadow-xl shadow-[#C8102E]/30"
          >
            Start Free Trial →
          </Link>
        </div>
      </section>

      <MarketingFooter />

    </div>
  );
}
