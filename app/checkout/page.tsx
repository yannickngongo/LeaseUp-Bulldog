"use client";
import Link from "next/link";

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans flex flex-col">
      <header className="border-b border-[#1E1E2E] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-green-400">🔒</span> Secured by Stripe
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-start justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid gap-10 md:grid-cols-[1fr_380px] items-start">

          {/* Left — payment form */}
          <div>
            <h1 className="mb-2 text-3xl font-black">Complete your order</h1>
            <p className="mb-8 text-sm text-gray-500">14-day free trial · Charged after trial ends · Cancel anytime</p>

            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              {/* Contact */}
              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">Contact Info</h2>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="text" placeholder="First Name" className="w-full rounded-lg border border-[#1E1E2E] bg-[#10101A] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                    <input type="text" placeholder="Last Name" className="w-full rounded-lg border border-[#1E1E2E] bg-[#10101A] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                  </div>
                  <input type="email" placeholder="Email address" className="w-full rounded-lg border border-[#1E1E2E] bg-[#10101A] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                </div>
              </div>

              {/* Plan */}
              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">Plan</h2>
                <div className="space-y-2">
                  {[
                    { id: "starter", label: "Starter", price: "$199/mo", desc: "1 property · Unlimited leads · AI SMS" },
                    { id: "growth", label: "Growth", price: "$399/mo", desc: "Up to 10 properties · Full features", popular: true },
                  ].map((plan) => (
                    <label key={plan.id} className="flex cursor-pointer items-center gap-4 rounded-xl border border-[#1E1E2E] bg-[#10101A] px-5 py-4 hover:border-[#C8102E]/40 transition-colors">
                      <input type="radio" name="plan" value={plan.id} defaultChecked={plan.popular} className="accent-[#C8102E]" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{plan.label}</span>
                          {plan.popular && <span className="rounded bg-[#C8102E]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#C8102E]">Popular</span>}
                        </div>
                        <span className="text-xs text-gray-500">{plan.desc}</span>
                      </div>
                      <span className="font-bold text-white">{plan.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Card */}
              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">Payment (charged after 14-day trial)</h2>
                <div className="space-y-3 rounded-xl border border-[#1E1E2E] bg-[#10101A] p-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-400">Card Number</label>
                    <input type="text" placeholder="1234 5678 9012 3456" className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-400">Expiry</label>
                      <input type="text" placeholder="MM / YY" className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-400">CVC</label>
                      <input type="text" placeholder="•••" className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-400">Name on Card</label>
                    <input type="text" placeholder="Marcus Thompson" className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                  </div>
                </div>
              </div>

              <Link
                href="/checkout/success"
                className="block w-full rounded-xl bg-[#C8102E] py-4 text-center text-sm font-bold text-white hover:bg-[#A50D25] transition-colors shadow-lg shadow-[#C8102E]/25"
              >
                Start Free Trial — Due Today: $0.00 →
              </Link>
            </form>

            <p className="mt-4 text-center text-xs text-gray-600">
              By continuing you agree to our <a href="#" className="hover:underline">Terms</a>. Your card won&apos;t be charged until day 14.
            </p>
          </div>

          {/* Right — order summary */}
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6 sticky top-6">
            <h2 className="mb-5 font-semibold text-white">Order Summary</h2>

            <div className="mb-5 rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/5 p-4">
              <p className="font-bold text-white">Growth Plan</p>
              <p className="text-xs text-gray-400 mt-0.5">Up to 10 properties · All features</p>
              <p className="mt-3 text-2xl font-black text-white">$399<span className="text-sm font-normal text-gray-500">/mo per property</span></p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Trial period</span>
                <span className="text-white font-medium">14 days</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Due today</span>
                <span className="text-green-400 font-bold">$0.00</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>After trial</span>
                <span className="text-white">$399/mo per property</span>
              </div>
            </div>

            <div className="my-5 border-t border-[#1E1E2E]" />

            <ul className="space-y-2">
              {[
                "14-day free trial",
                "Cancel anytime",
                "Unlimited leads",
                "AI responses 24/7",
                "Priority support",
              ].map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-[#C8102E]">✓</span>
                  {perk}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-600">
              <span>🔒</span>
              Secured by Stripe · 256-bit SSL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
