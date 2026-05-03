"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getOperatorEmail } from "@/lib/demo-auth";
import { isMarketingAddonLive } from "@/lib/feature-flags";

// ── Plan config ───────────────────────────────────────────────────────────────

const PLANS = [
  {
    id:             "starter",
    label:          "Starter",
    price:          "$500/mo",
    monthlyAmount:  500,
    performanceFee: "$200/lease",
    desc:           "Up to 3 properties · AI qualification · Full dashboard",
    popular:        false,
  },
  {
    id:             "pro",
    label:          "Pro",
    price:          "$1,500/mo",
    monthlyAmount:  1500,
    performanceFee: "$150/lease",
    desc:           "Up to 20 properties · All Starter features + portfolio view",
    popular:        true,
  },
  {
    id:             "portfolio",
    label:          "Portfolio",
    price:          "$3,000/mo",
    monthlyAmount:  3000,
    performanceFee: "$100/lease",
    desc:           "Unlimited properties · All Pro features + dedicated support",
    popular:        false,
  },
];

// ── Checkout form ─────────────────────────────────────────────────────────────

function CheckoutForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const cancelled = params.get("cancelled") === "1";

  // Pre-select plan from URL param (e.g. /checkout?plan=pro)
  const defaultPlan = PLANS.find(p => p.id === params.get("plan"))?.id ?? "pro";

  const [selectedPlan,    setSelectedPlan]    = useState(defaultPlan);
  const [marketingAddon,  setMarketingAddon]  = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [waitlistEmail,   setWaitlistEmail]   = useState("");
  const [waitlistDone,    setWaitlistDone]    = useState(false);
  const addonLive = isMarketingAddonLive();

  const plan = PLANS.find(p => p.id === selectedPlan) ?? PLANS[1];

  // Force-disable marketing add-on charge if it's not live
  const totalMonthly = plan.monthlyAmount + (addonLive && marketingAddon ? 500 : 0);

  async function joinMarketingWaitlist() {
    if (!waitlistEmail.trim()) return;
    try {
      const res = await fetch("/api/marketing-waitlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: waitlistEmail.trim(), source: "billing_page" }),
      });
      if (res.ok) setWaitlistDone(true);
    } catch { /* swallow */ }
  }

  async function handleCheckout() {
    setError(null);
    setLoading(true);
    try {
      const email = await getOperatorEmail();
      if (!email) {
        router.push("/login?redirect=/checkout");
        return;
      }

      const res = await fetch("/api/checkout/create-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan: selectedPlan, marketing_addon: addonLive && marketingAddon, email }),
      });

      let json: { url?: string; error?: string } = {};
      try { json = await res.json(); } catch { /* non-JSON response */ }

      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = json.url;
    } catch {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#1E1E2E] bg-[#08080F]/90 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="inline-block h-2 w-2 rounded-full bg-[#C8102E] pulse-dot" />
            <span className="text-white">LeaseUp <span className="text-[#C8102E]">Bulldog</span></span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
            <svg className="h-3.5 w-3.5 text-[#F87171]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Secured by Stripe
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 items-start justify-center overflow-hidden px-6 py-16">
        {/* Subtle ambient bg */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(200,16,46,0.18) 0%, transparent 70%)", filter: "blur(80px)" }}
          />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `linear-gradient(rgba(200,16,46,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(200,16,46,0.08) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
              maskImage: `radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)`,
              WebkitMaskImage: `radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)`,
            }}
          />
        </div>

        <div className="relative w-full max-w-5xl grid gap-10 md:grid-cols-[1fr_380px] items-start">

          {/* Left — selection */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C8102E]/40 bg-[#C8102E]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#F87171] backdrop-blur-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C8102E] pulse-dot" />
              Checkout
            </div>
            <h1 className="mb-3 text-4xl font-black tracking-tight md:text-5xl">
              Complete your <span className="text-[#C8102E]">order.</span>
            </h1>
            <p className="mb-8 text-base font-medium text-gray-300">
              14-day free trial · No setup fee · Platform fee starts after trial
            </p>

            {cancelled && (
              <div className="mb-6 rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/10 px-4 py-3 text-sm text-[#F87171]">
                Checkout was cancelled — no charge was made. Pick a plan when you&apos;re ready.
              </div>
            )}

            {/* Plan selector */}
            <div className="mb-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">Choose Your Plan</h2>
              <div className="space-y-3">
                {PLANS.map((p) => (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${
                      selectedPlan === p.id
                        ? "border-[#C8102E]/60 bg-[#C8102E]/5"
                        : "border-[#1E1E2E] bg-[#10101A] hover:border-[#C8102E]/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={p.id}
                      checked={selectedPlan === p.id}
                      onChange={() => setSelectedPlan(p.id)}
                      className="accent-[#C8102E]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{p.label}</span>
                        {p.popular && (
                          <span className="rounded bg-[#C8102E]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#C8102E]">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-white">{p.price}</p>
                      <p className="text-[11px] text-gray-500">+ {p.performanceFee} signed</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Marketing add-on */}
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-500">Add-Ons</h2>

              {addonLive ? (
                <label
                  className={`flex cursor-pointer items-start gap-4 rounded-xl border px-5 py-4 transition-colors ${
                    marketingAddon
                      ? "border-purple-500/50 bg-purple-900/10"
                      : "border-[#1E1E2E] bg-[#10101A] hover:border-purple-500/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marketingAddon}
                    onChange={e => setMarketingAddon(e.target.checked)}
                    className="mt-0.5 accent-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Marketing Add-On</span>
                      <span className="rounded bg-purple-900/40 px-1.5 py-0.5 text-[10px] font-bold text-purple-400">Optional</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      AI ad creative for Facebook & Google. Campaigns auto-built, you approve before they go live.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-white">$500/mo</p>
                    <p className="text-[11px] text-gray-500">+ 5% of ad spend</p>
                  </div>
                </label>
              ) : (
                /* Coming Soon — waitlist instead of checkbox */
                <div className="rounded-xl border border-amber-800/30 bg-amber-950/20 px-5 py-4">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">Marketing Add-On</span>
                        <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">Coming Soon</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        AI ad creative for Facebook & Google. Launching shortly — get notified.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-500 line-through">$500/mo</p>
                      <p className="text-[11px] text-gray-500">+ 5% of ad spend</p>
                    </div>
                  </div>
                  {waitlistDone ? (
                    <p className="text-xs text-green-400">✓ You&apos;ll be notified when this launches.</p>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={waitlistEmail}
                        onChange={e => setWaitlistEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="flex-1 rounded-lg border border-amber-800/30 bg-[#0a0a12] px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={joinMarketingWaitlist}
                        disabled={!waitlistEmail.trim()}
                        className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-[#0a0a12] hover:bg-amber-400 disabled:opacity-50 transition-colors"
                      >
                        Notify me
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="block w-full rounded-xl bg-[#C8102E] py-4 text-center text-sm font-bold text-white hover:bg-[#A50D25] transition-colors shadow-lg shadow-[#C8102E]/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Redirecting to Stripe…" : "Start 14-Day Free Trial →"}
            </button>

            <p className="mt-4 text-center text-xs text-gray-600">
              By continuing you agree to our{" "}
              <Link href="/terms" className="hover:underline">Terms</Link>.{" "}
              Platform fee of ${totalMonthly.toLocaleString()}/mo begins after your 14-day trial.
            </p>
          </div>

          {/* Right — order summary */}
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6 sticky top-6">
            <h2 className="mb-5 font-semibold text-white">Order Summary</h2>

            {/* Selected plan */}
            <div className="mb-4 rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/5 p-4">
              <p className="font-bold text-white">{plan.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{plan.desc}</p>
              <p className="mt-2 text-2xl font-black text-white">
                {plan.price}
                <span className="text-sm font-normal text-gray-500"> after trial</span>
              </p>
            </div>

            {/* Marketing addon summary */}
            {addonLive && marketingAddon && (
              <div className="mb-4 rounded-xl border border-purple-500/30 bg-purple-900/10 p-4">
                <p className="font-bold text-white text-sm">Marketing Add-On</p>
                <p className="text-xs text-gray-400 mt-0.5">$500/mo + 5% of ad spend</p>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Due today</span>
                <span className="text-green-400 font-bold">$0</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Trial period</span>
                <span className="text-white font-medium">14 days</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Platform fee after trial</span>
                <span className="text-white">{plan.price}</span>
              </div>
              {addonLive && marketingAddon && (
                <div className="flex justify-between text-gray-400">
                  <span>Marketing add-on after trial</span>
                  <span className="text-white">$500/mo + 5%</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400">
                <span>Performance fee</span>
                <span className="text-white">{plan.performanceFee} signed</span>
              </div>
              <div className="border-t border-[#1E1E2E] pt-3 flex justify-between">
                <span className="font-semibold text-white">Monthly after trial</span>
                <span className="font-black text-white">
                  ${totalMonthly.toLocaleString()}/mo{addonLive && marketingAddon ? " + 5%" : ""}
                </span>
              </div>
            </div>

            <div className="my-5 border-t border-[#1E1E2E]" />

            <ul className="space-y-2">
              {[
                "14-day pilot — nothing due today",
                "No setup fee",
                "Unlimited leads during trial",
                "AI responses 24/7",
                `${plan.performanceFee} — only when we deliver`,
                "Cancel anytime",
              ].map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-[#C8102E]">✓</span>
                  {perk}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-600">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
              Secured by Stripe · 256-bit SSL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#08080F]" />}>
      <CheckoutForm />
    </Suspense>
  );
}
