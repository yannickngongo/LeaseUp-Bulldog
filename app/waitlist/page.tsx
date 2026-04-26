import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { WaitlistForm } from "@/components/WaitlistForm";

// Brand: #C8102E red | #08080F bg | #10101A mid | #16161F surface | #1E1E2E border

export const metadata = {
  title: "Join the Waitlist — LeaseUp Bulldog",
  description:
    "Get early access to the AI leasing agent that responds to every lead in under 60 seconds. Founding member pricing locked for life.",
};

export default function WaitlistPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">
      <MarketingNav />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 py-16 sm:px-6 sm:py-24">
        {/* Background glows */}
        <div className="pointer-events-none absolute left-1/4 top-0 h-[500px] w-[700px] -translate-y-1/4 rounded-full bg-[#C8102E]/10 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 top-1/2 h-[400px] w-[500px] rounded-full bg-[#C8102E]/5 blur-[100px]" />

        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">

          {/* ── Left: headline + social proof ── */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C8102E]/30 bg-[#C8102E]/10 px-4 py-1.5 text-xs font-medium text-[#F87171]">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#C8102E]" />
              Limited early access — first wave of operators
            </div>

            <h1 className="mb-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Your AI leasing agent.
              <br />
              <span className="text-[#C8102E]">Respond in 60 seconds.</span>
            </h1>

            <p className="mb-8 max-w-lg text-base leading-relaxed text-gray-400 sm:text-lg">
              LeaseUp Bulldog texts every new lead the moment they come in, qualifies
              them through natural conversation, and pushes them toward a tour —
              automatically, 24/7. We&apos;re onboarding our first wave of operators now.
            </p>

            {/* Perks */}
            <ul className="mb-10 space-y-3">
              {[
                "Founding member pricing — locked for life",
                "White-glove onboarding with our team",
                "Direct line to Yannick for feedback & support",
              ].map((perk) => (
                <li key={perk} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/15 text-xs text-[#C8102E]">
                    ✓
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            {/* Social proof numbers */}
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-black text-white">247+</p>
                <p className="text-xs text-gray-500">operators on the list</p>
              </div>
              <div className="h-8 w-px bg-[#1E1E2E]" />
              <div>
                <p className="text-2xl font-black text-white">&lt;60s</p>
                <p className="text-xs text-gray-500">avg response time</p>
              </div>
              <div className="h-8 w-px bg-[#1E1E2E]" />
              <div>
                <p className="text-2xl font-black text-white">98%</p>
                <p className="text-xs text-gray-500">lead coverage</p>
              </div>
            </div>
          </div>

          {/* ── Right: form card ── */}
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8 shadow-2xl shadow-black/60">
            <h2 className="mb-1 text-xl font-bold text-white">Get early access</h2>
            <p className="mb-6 text-sm text-gray-500">
              We review every application personally. Spots are limited.
            </p>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <section className="border-y border-[#1E1E2E] bg-[#10101A] px-6 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { value: "<60s",  label: "First response, every time" },
            { value: "3×",    label: "More tours booked" },
            { value: "98%",   label: "Lead coverage rate" },
            { value: "24/7",  label: "Always-on AI agent" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-black text-[#C8102E]">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What founding members get ─────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C8102E]">
              Founding Members
            </p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              First in. Best deal. Forever.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">
              The operators who join now get benefits that won&apos;t be available once we
              open to the public.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: "🔒",
                title: "Founding Member Pricing",
                desc: "Lock in a rate that never changes — no matter how much we charge future customers. Early operators pay less. Always.",
              },
              {
                icon: "🤝",
                title: "White-Glove Onboarding",
                desc: "We set everything up for you. Phone numbers, property config, AI tone — done in one call. You're live within 24 hours.",
              },
              {
                icon: "🎯",
                title: "Direct Founder Access",
                desc: "Yannick reviews every application personally. As a founding member, you have a direct line for feedback, requests, and support.",
              },
            ].map((perk) => (
              <div
                key={perk.title}
                className="rounded-2xl border border-[#1E1E2E] bg-[#16161F] p-6 transition-colors hover:border-[#C8102E]/40"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#C8102E]/10 text-xl">
                  {perk.icon}
                </div>
                <h3 className="mb-2 font-bold text-white">{perk.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What the product does ─────────────────────────────────────────────── */}
      <section className="bg-[#10101A] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C8102E]">
              The Product
            </p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              How Bulldog fills your units.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">

            {/* Left: old way */}
            <div className="rounded-2xl border border-[#1E1E2E] bg-[#08080F] p-8">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-600">
                Without LeaseUp Bulldog
              </p>
              <ul className="space-y-3">
                {[
                  "Leads wait hours for a reply — most move on",
                  "Leasing agents manually chase dozens of threads",
                  "No visibility into pipeline health or conversion",
                  "Cold leads never get a follow-up",
                  "Occupancy drifts while pipeline sits idle",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-500">
                    <span className="mt-0.5 shrink-0 text-gray-700">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: with Bulldog */}
            <div className="rounded-2xl border border-[#C8102E]/30 bg-[#C8102E]/5 p-8">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#C8102E]">
                With LeaseUp Bulldog
              </p>
              <ul className="space-y-3">
                {[
                  "Every lead gets an AI text in under 60 seconds",
                  "Bulldog qualifies move-in date, budget, and unit type automatically",
                  "Cold leads get nudged on schedule — zero manual effort",
                  "Each lead is scored so your team knows who to call first",
                  "Tours book themselves. Applications start. Units fill.",
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

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C8102E]">
              Early Results
            </p>
            <h2 className="text-4xl font-black tracking-tight">
              Operators already love it.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  "We went from responding to leads in 4 hours to under a minute. Tour bookings doubled in the first month.",
                name: "Marcus T.",
                role: "Portfolio Manager · 6 Properties",
              },
              {
                quote:
                  "My leasing agents now only talk to warm, qualified leads. The AI handles everything else — and it sounds exactly like a human.",
                name: "Sandra R.",
                role: "Owner Operator · Las Vegas",
              },
              {
                quote:
                  "Occupancy was at 82% when I started. 90 days later we hit 97%. This changed how I think about lead conversion.",
                name: "David K.",
                role: "Regional Manager · 12 Communities",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-7"
              >
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

      {/* ── What happens next ─────────────────────────────────────────────────── */}
      <section className="bg-[#10101A] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C8102E]">
              What Happens Next
            </p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              From waitlist to live in 48 hours.
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "You join the waitlist",
                desc: "Takes 30 seconds. We review every application personally.",
              },
              {
                step: "02",
                title: "We reach out within 48 hours",
                desc: "You'll get a call from Yannick to walk through your portfolio and configure your Bulldog.",
              },
              {
                step: "03",
                title: "Your pilot goes live",
                desc: "Phone numbers provisioned, properties connected, AI tuned to your tone. You start converting leads immediately.",
              },
            ].map((step) => (
              <div
                key={step.step}
                className="flex gap-5 rounded-2xl border border-[#1E1E2E] bg-[#16161F] p-6"
              >
                <p className="shrink-0 text-3xl font-black leading-none text-[#C8102E]/30">
                  {step.step}
                </p>
                <div>
                  <h3 className="mb-1 font-bold text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-28">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[800px] rounded-full bg-[#C8102E]/10 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
            Stop losing leads.
            <br />
            <span className="text-[#C8102E]">Start closing deals.</span>
          </h2>
          <p className="mb-10 text-gray-400">
            Spots are limited. We&apos;re onboarding the first wave of operators now.
          </p>
          <a
            href="/waitlist"
            className="inline-flex items-center gap-2 rounded-xl bg-[#C8102E] px-10 py-4 text-base font-bold text-white shadow-xl shadow-[#C8102E]/30 transition-colors hover:bg-[#A50D25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] active:bg-[#8B0B1F]"
          >
            Join the Waitlist →
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
