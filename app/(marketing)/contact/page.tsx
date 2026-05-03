"use client";
import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { isMarketingAddonLive } from "@/lib/feature-flags";
import { IconCalendar, IconChat, IconLifebuoy } from "@/components/marketing/Icons";
import { Reveal } from "@/components/marketing/Reveal";
import { PageBackground } from "@/components/marketing/PageBackground";
import type { ComponentType } from "react";

type ContactItem = { Icon: ComponentType<{ className?: string; size?: number }>; title: string; desc: string };

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">
      <MarketingNav />

      <section className="relative overflow-hidden px-6 py-24">
        <PageBackground variant="hero" />

        <div className="relative mx-auto max-w-5xl grid gap-16 md:grid-cols-2">
          {/* Left */}
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#C8102E]/40 bg-[#C8102E]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#F87171] backdrop-blur-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C8102E] animate-pulse" />
              Contact
            </div>
            <h1
              className="mb-6 text-5xl font-black leading-[0.95] tracking-tight md:text-6xl"
              style={{ textShadow: "0 2px 24px rgba(0,0,0,0.85)" }}
            >
              Let&apos;s <span className="text-[#C8102E]">talk leasing.</span>
            </h1>
            <p
              className="mb-8 text-lg font-medium text-gray-300 leading-relaxed"
              style={{ textShadow: "0 2px 16px rgba(0,0,0,0.85)" }}
            >
              Whether you&apos;re managing 1 property or 100, we&apos;d love to show you what LeaseUp Bulldog can do for your pipeline.
            </p>

            <div className="space-y-5">
              {([
                { Icon: IconCalendar, title: "Book a demo", desc: "30 minutes. We'll show you a live walkthrough with your property's data." },
                { Icon: IconChat, title: "Sales inquiry", desc: "Have questions about Portfolio pricing or custom integrations? We'll get back to you same day." },
                { Icon: IconLifebuoy, title: "Support", desc: "Already a customer? Email support@leaseupbulldog.com or use the chat in your dashboard." },
              ] as ContactItem[]).map((item) => (
                <div
                  key={item.title}
                  className="group flex gap-4 rounded-xl border border-[#1E1E2E] bg-[#10101A] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C8102E]/60 hover:shadow-[0_0_30px_rgba(200,16,46,0.2)]"
                >
                  <div className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/10 text-[#F87171]">
                    <item.Icon size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-400 leading-relaxed">{item.desc}</p>
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

      {/* Pricing at a glance */}
      <section className="border-t border-[#1E1E2E] bg-[#10101A] px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-6">Pricing at a Glance</p>
          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            {[
              { name: "Starter",   price: "$500/mo",   perf: "+ $200/lease", range: "1–3 properties" },
              { name: "Pro",       price: "$1,500/mo", perf: "+ $150/lease", range: "4–20 properties" },
              { name: "Portfolio", price: "$3,000/mo", perf: "+ $100/lease", range: "20+ properties"  },
            ].map((plan) => (
              <div key={plan.name} className="rounded-xl border border-[#1E1E2E] bg-[#16161F] px-5 py-4 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{plan.name}</p>
                <p className="text-xl font-black text-white">{plan.price}</p>
                <p className="text-xs text-gray-500">{plan.perf}</p>
                <p className="text-xs text-gray-600 mt-1">{plan.range}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[#1E1E2E] bg-[#10101A] px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-sm font-bold text-[#F87171]">Marketing Add-On</span>
              <span className="ml-2 text-sm text-white font-black">$500/mo + 5% of ad spend</span>
              <span className="ml-2 text-xs text-gray-400">— AI creative & copy for Facebook & Google</span>
            </div>
            <span className="text-xs text-gray-500 shrink-0">
              {isMarketingAddonLive() ? "$5K spend = $750/mo total" : "Coming Soon"}
            </span>
          </div>
          <p className="text-center mt-4 text-xs text-gray-600">No setup fee · 14-day pilot · <Link href="/pricing" className="text-[#C8102E] hover:underline">Full pricing →</Link></p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
