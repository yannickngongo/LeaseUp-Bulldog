import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

const PLANS = [
  {
    name: "Starter",
    price: "$199",
    period: "/mo per property",
    desc: "For operators with 1–2 properties getting started with AI leasing.",
    features: [
      "1 property",
      "Unlimited leads",
      "AI SMS responses",
      "Lead qualification",
      "Basic dashboard",
      "Email support",
    ],
    notIncluded: ["Automated follow-ups", "Lead scoring", "Tour tracking", "Priority support"],
    cta: "Start Free Trial",
    href: "/free-trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$399",
    period: "/mo per property",
    desc: "For active operators running 3–10 properties with a full pipeline.",
    features: [
      "Up to 10 properties",
      "Everything in Starter",
      "Automated follow-ups",
      "AI lead scoring",
      "Tour tracking",
      "Application push",
      "Priority support",
    ],
    notIncluded: ["Custom integrations", "Dedicated account manager"],
    cta: "Start Free Trial",
    href: "/free-trial",
    highlight: true,
  },
  {
    name: "Portfolio",
    price: "Custom",
    period: "",
    desc: "For institutional operators managing 10+ communities.",
    features: [
      "Unlimited properties",
      "Everything in Growth",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom AI persona",
      "White-label option",
    ],
    notIncluded: [],
    cta: "Contact Sales",
    href: "/contact",
    highlight: false,
  },
];

const FAQS = [
  {
    q: "Is there a free trial?",
    a: "Yes — 14 days free on any plan. No credit card required to start. You'll be prompted to add payment info before day 14.",
  },
  {
    q: "What counts as a 'property'?",
    a: "One property = one apartment community with its own Twilio phone number. You can have multiple buildings at the same address under one property.",
  },
  {
    q: "How does billing work?",
    a: "You're billed monthly per property. Upgrade, downgrade, or cancel anytime from your account settings.",
  },
  {
    q: "Can I add more properties mid-cycle?",
    a: "Yes. Additional properties are prorated from the date you add them.",
  },
  {
    q: "Does it work with my existing lead sources?",
    a: "Yes — any lead source that sends an email or webhook works. Zillow, Apartments.com, Facebook, your own website, manual entry, all supported.",
  },
  {
    q: "Is SMS usage included in the price?",
    a: "Twilio SMS costs are passed through at cost (typically $0.0079/message). These are minimal for most operators.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-20 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-[#C8102E]/10 blur-[100px]" />
        <div className="relative mx-auto max-w-2xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#C8102E]">Pricing</p>
          <h1 className="mb-5 text-5xl font-black tracking-tight md:text-6xl">
            Simple, honest pricing.
          </h1>
          <p className="text-lg text-gray-400">
            Pay per property. Cancel anytime. Start free.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  plan.highlight
                    ? "border-[#C8102E] bg-[#C8102E]/5"
                    : "border-[#1E1E2E] bg-[#10101A]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#C8102E] px-4 py-1 text-xs font-bold text-white whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <p className="mb-1 font-semibold text-gray-400">{plan.name}</p>
                  <div className="mb-2 flex items-end gap-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    {plan.period && <span className="mb-1 text-sm text-gray-500">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-gray-500">{plan.desc}</p>
                </div>

                <div className="flex-1">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-600">Included</p>
                  <ul className="mb-5 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                        <span className="shrink-0 text-[#C8102E]">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {plan.notIncluded.length > 0 && (
                    <>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-700">Not included</p>
                      <ul className="mb-5 space-y-2.5">
                        {plan.notIncluded.map((f) => (
                          <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                            <span className="shrink-0">—</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <Link
                  href={plan.href}
                  className={`mt-4 block w-full rounded-xl py-3 text-center text-sm font-bold transition-colors ${
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

          <p className="mt-6 text-center text-xs text-gray-600">
            All plans include a 14-day free trial. Twilio SMS costs passed through at cost.
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-y border-[#1E1E2E] bg-[#10101A] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-3xl font-black">Compare plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E2E]">
                  <th className="pb-4 text-left font-semibold text-gray-500">Feature</th>
                  <th className="pb-4 text-center font-semibold text-gray-300">Starter</th>
                  <th className="pb-4 text-center font-semibold text-[#C8102E]">Growth</th>
                  <th className="pb-4 text-center font-semibold text-gray-300">Portfolio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E2E]">
                {[
                  ["Properties", "1", "Up to 10", "Unlimited"],
                  ["Leads", "Unlimited", "Unlimited", "Unlimited"],
                  ["AI SMS Response", "✓", "✓", "✓"],
                  ["Lead Qualification", "✓", "✓", "✓"],
                  ["Dashboard", "Basic", "Full", "Full"],
                  ["Automated Follow-Up", "—", "✓", "✓"],
                  ["Lead Scoring", "—", "✓", "✓"],
                  ["Tour Tracking", "—", "✓", "✓"],
                  ["Application Push", "—", "✓", "✓"],
                  ["Custom Integrations", "—", "—", "✓"],
                  ["Dedicated Account Manager", "—", "—", "✓"],
                  ["SLA Guarantee", "—", "—", "✓"],
                  ["Support", "Email", "Priority", "Dedicated"],
                ].map(([feat, s, g, p]) => (
                  <tr key={feat}>
                    <td className="py-3 text-gray-400">{feat}</td>
                    <td className="py-3 text-center text-gray-500">{s}</td>
                    <td className="py-3 text-center text-gray-200">{g}</td>
                    <td className="py-3 text-center text-gray-500">{p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-3xl font-black">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-[#1E1E2E] bg-[#10101A] p-6">
                <p className="mb-2 font-semibold text-white">{faq.q}</p>
                <p className="text-sm leading-relaxed text-gray-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-6 py-20 text-center">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[600px] rounded-full bg-[#C8102E]/10 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-xl">
          <h2 className="mb-5 text-4xl font-black">Start free. Upgrade anytime.</h2>
          <p className="mb-8 text-gray-400">14-day trial, no credit card required.</p>
          <Link
            href="/free-trial"
            className="inline-block rounded-xl bg-[#C8102E] px-10 py-4 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors shadow-lg shadow-[#C8102E]/25"
          >
            Start Free Trial →
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
