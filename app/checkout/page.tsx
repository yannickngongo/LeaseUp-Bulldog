"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getOperatorEmail } from "@/lib/demo-auth";

const PLANS = [
  {
    id: "core",
    label: "Core Platform",
    price: "$1,000/mo",
    setup: "$1,000",
    desc: "AI qualification · Full dashboard · Unlimited leads",
    popular: true,
  },
  {
    id: "core_marketing",
    label: "Core + Marketing",
    price: "$3,000/mo",
    setup: "$1,000",
    desc: "Platform + AI ad campaigns (Facebook & Google)",
    popular: false,
  },
];

function CheckoutForm() {
  const router = useRouter();
  const params = useSearchParams();
  const cancelled = params.get("cancelled") === "1";

  const [selectedPlan, setSelectedPlan] = useState("core");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = PLANS.find((p) => p.id === selectedPlan) ?? PLANS[0];

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, email }),
      });

      const json = await res.json();
      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = json.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans flex flex-col">
      <header className="border-b border-[#1E1E2E] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="h-3.5 w-3.5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            Secured by Stripe
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-start justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid gap-10 md:grid-cols-[1fr_380px] items-start">

          {/* Left — plan selection */}
          <div>
            <h1 className="mb-2 text-3xl font-black">Complete your order</h1>
            <p className="mb-8 text-sm text-gray-500">
              14-day pilot · $1,000 setup due today · No platform fee during trial
            </p>

            {cancelled && (
              <div className="mb-6 rounded-xl border border-yellow-900/50 bg-yellow-950/20 px-4 py-3 text-sm text-yellow-400">
                Payment was cancelled. Your account is still active — choose a plan when you&apos;re ready.
              </div>
            )}

            {/* Plan selector */}
            <div className="mb-8">
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
                            Popular
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{p.desc}</span>
                    </div>
                    <span className="font-bold text-white">{p.price}</span>
                  </label>
                ))}

                {/* Enterprise — contact sales */}
                <a
                  href="mailto:hello@leaseuupbulldog.com?subject=Enterprise%20Inquiry"
                  className="flex items-center gap-4 rounded-xl border border-[#1E1E2E] bg-[#10101A] px-5 py-4 hover:border-gray-600 transition-colors"
                >
                  <div className="h-4 w-4 rounded-full border-2 border-gray-600 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-white">Portfolio / Enterprise</span>
                    <p className="text-xs text-gray-500">Multi-property · Dedicated support · Custom integrations</p>
                  </div>
                  <span className="text-sm font-bold text-gray-400">Contact us →</span>
                </a>
              </div>

              <p className="mt-3 text-xs text-gray-600">
                + $200 per lease signed through LUB (performance fee — only when we deliver)
              </p>
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
              {loading
                ? "Redirecting to Stripe…"
                : `Start 14-Day Pilot — Pay ${plan.setup} Setup →`}
            </button>

            <p className="mt-4 text-center text-xs text-gray-600">
              By continuing you agree to our{" "}
              <Link href="/terms" className="hover:underline">Terms</Link>.{" "}
              Platform fee of {plan.price} begins after your 14-day pilot.
              You&apos;ll be redirected to Stripe&apos;s secure checkout.
            </p>
          </div>

          {/* Right — order summary */}
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6 sticky top-6">
            <h2 className="mb-5 font-semibold text-white">Order Summary</h2>

            <div className="mb-5 rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/5 p-4">
              <p className="font-bold text-white">{plan.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{plan.desc}</p>
              <p className="mt-3 text-2xl font-black text-white">
                {plan.price}
                <span className="text-sm font-normal text-gray-500"> after trial</span>
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>One-time setup</span>
                <span className="text-white font-bold">{plan.setup}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Trial period</span>
                <span className="text-white font-medium">14 days</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Platform fee during trial</span>
                <span className="text-green-400 font-bold">$0</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>After trial</span>
                <span className="text-white">{plan.price}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Performance fee</span>
                <span className="text-white">$200/lease signed</span>
              </div>
              <div className="border-t border-[#1E1E2E] pt-3 flex justify-between">
                <span className="font-semibold text-white">Due today</span>
                <span className="font-black text-white">{plan.setup}</span>
              </div>
            </div>

            <div className="my-5 border-t border-[#1E1E2E]" />

            <ul className="space-y-2">
              {[
                "14-day pilot included",
                "No platform fee during trial",
                "Unlimited leads",
                "AI responses 24/7",
                "$200/lease — only when we deliver",
                "Cancel anytime after trial",
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
