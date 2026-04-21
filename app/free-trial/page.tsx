"use client";
import Link from "next/link";

const PLAN_OPTIONS = [
  { id: "starter",   label: "Starter",   price: "$500/mo + $150/lease",   desc: "1–3 properties" },
  { id: "pro",       label: "Pro",       price: "$1,500/mo + $200/lease", desc: "4–20 properties", popular: true },
  { id: "portfolio", label: "Portfolio", price: "$3,000/mo + $250/lease", desc: "20+ properties" },
];

const PERKS = [
  "14-day pilot — no setup fee, no platform fee",
  "First AI conversation live in under 10 minutes",
  "Per-lease fee only when we deliver a signed lease",
  "Cancel anytime — 30-day results guarantee",
];

export default function FreeTrialPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans flex flex-col">
      <header className="border-b border-[#1E1E2E] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </Link>
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[#C8102E] hover:underline font-medium">Log in</Link>
          </p>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="relative w-full max-w-5xl">
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/4 h-[400px] w-[700px] rounded-full bg-[#C8102E]/10 blur-[100px]" />

          <div className="relative grid gap-12 md:grid-cols-2 items-start">
            {/* Left — value prop */}
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#C8102E]">14-Day Free Trial</p>
              <h1 className="mb-6 text-4xl font-black tracking-tight md:text-5xl leading-tight">
                Start converting leads<br />today. No risk.
              </h1>
              <p className="mb-8 text-gray-400 leading-relaxed">
                Set up your first property in minutes and watch LeaseUp Bulldog respond to your very first lead — automatically.
              </p>

              <ul className="mb-10 space-y-3">
                {PERKS.map((perk) => (
                  <li key={perk} className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/20 text-xs text-[#C8102E]">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>

              <div className="rounded-xl border border-[#1E1E2E] bg-[#10101A] p-5">
                <p className="mb-1 text-sm font-semibold text-white">&ldquo;We had our first AI lead reply going in under 8 minutes. It was surreal.&rdquo;</p>
                <p className="text-xs text-gray-500">— Marcus T., Portfolio Manager · 6 Properties</p>
              </div>
            </div>

            {/* Right — form */}
            <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8">
              <h2 className="mb-6 text-xl font-bold">Start your free trial</h2>

              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-400">First Name</label>
                    <input type="text" placeholder="Marcus" className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-400">Last Name</label>
                    <input type="text" placeholder="Thompson" className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-400">Work Email</label>
                  <input type="email" placeholder="you@company.com" className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-400">Password</label>
                  <input type="password" placeholder="Min. 8 characters" className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-400">Choose a plan to trial</label>
                  <div className="space-y-2">
                    {PLAN_OPTIONS.map((plan) => (
                      <label key={plan.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 hover:border-[#C8102E]/40 transition-colors">
                        <input type="radio" name="plan" value={plan.id} defaultChecked={plan.popular} className="accent-[#C8102E]" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-white">{plan.label}</span>
                          <span className="ml-2 text-xs text-gray-500">{plan.desc}</span>
                        </div>
                        <span className="text-xs text-gray-400">{plan.price}</span>
                        {plan.popular && (
                          <span className="rounded bg-[#C8102E]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#C8102E]">Popular</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="block w-full rounded-xl bg-[#C8102E] py-3.5 text-center text-sm font-bold text-white hover:bg-[#A50D25] transition-colors mt-2 shadow-lg shadow-[#C8102E]/25"
                >
                  Start Free Trial →
                </Link>
              </form>

              <p className="mt-4 text-center text-xs text-gray-600">
                No setup fee. Platform fee starts after your 14-day pilot ends.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
