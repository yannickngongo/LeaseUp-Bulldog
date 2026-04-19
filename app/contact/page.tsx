"use client";
import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">
      <MarketingNav />

      <section className="relative overflow-hidden px-6 py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-[#C8102E]/10 blur-[100px]" />

        <div className="relative mx-auto max-w-5xl grid gap-16 md:grid-cols-2">
          {/* Left */}
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#C8102E]">Contact</p>
            <h1 className="mb-6 text-4xl font-black tracking-tight md:text-5xl">
              Let&apos;s talk leasing.
            </h1>
            <p className="mb-8 text-gray-400 leading-relaxed">
              Whether you&apos;re managing 1 property or 100, we&apos;d love to show you what LeaseUp Bulldog can do for your pipeline.
            </p>

            <div className="space-y-5">
              {[
                {
                  icon: "📅",
                  title: "Book a demo",
                  desc: "30 minutes. We'll show you a live walkthrough with your property's data.",
                },
                {
                  icon: "💬",
                  title: "Sales inquiry",
                  desc: "Have questions about Portfolio pricing or custom integrations? We'll get back to you same day.",
                },
                {
                  icon: "🛟",
                  title: "Support",
                  desc: "Already a customer? Email support@leaseupbulldog.com or use the chat in your dashboard.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 rounded-xl border border-[#1E1E2E] bg-[#10101A] p-5">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8">
            <h2 className="mb-6 text-xl font-bold">Send us a message</h2>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-400">First Name</label>
                  <input
                    type="text"
                    placeholder="Marcus"
                    className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-400">Last Name</label>
                  <input
                    type="text"
                    placeholder="Thompson"
                    className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-400">Work Email</label>
                <input
                  type="email"
                  placeholder="marcus@yourcompany.com"
                  className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-400">Phone</label>
                <input
                  type="tel"
                  placeholder="+1 702 555 0100"
                  className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-400">How many properties do you manage?</label>
                <select className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white focus:border-[#C8102E] focus:outline-none">
                  <option value="">Select...</option>
                  <option>1–2</option>
                  <option>3–10</option>
                  <option>11–50</option>
                  <option>50+</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-400">Message</label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your properties and what you're trying to solve..."
                  className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#C8102E] py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
              >
                Send Message →
              </button>
            </form>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
