import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

const STEPS = [
  {
    step: "01",
    title: "Connect your properties",
    desc: "Add each apartment community to your account. Each property gets a dedicated Twilio phone number — your AI agent's direct line. Leads from any source (Zillow, Apartments.com, Facebook, your website) are mapped to the right property automatically.",
    details: [
      "Takes under 5 minutes per property",
      "Phone numbers provisioned instantly",
      "Set current specials, unit availability, and contact preferences",
      "Works with any lead source that sends email or webhooks",
    ],
    side: "Mock: property setup card",
  },
  {
    step: "02",
    title: "A lead comes in",
    desc: "The moment a prospect submits their info — from any source — LeaseUp Bulldog receives it. Within seconds, the AI sends a personalized, human-sounding SMS reply from your property's number.",
    details: [
      "Response triggered in under 60 seconds",
      "Personalized with property name and current specials",
      "Conversation continues in that same SMS thread",
      "Inbound replies handled automatically, 24/7",
    ],
    side: "Mock: SMS thread",
  },
  {
    step: "03",
    title: "AI qualifies the lead",
    desc: "Through natural conversation, the AI gathers the four qualification signals: move-in date, unit type, budget, and pets. It asks one question at a time so it never feels like a form.",
    details: [
      "Adapts to how the lead responds",
      "Handles vague answers ('around $1,800')",
      "Updates the lead record in real time",
      "Triggers AI lead score (1–10) when complete",
    ],
    side: "Mock: qualification data",
  },
  {
    step: "04",
    title: "Hot leads surface in your dashboard",
    desc: "Once a lead is qualified, your team can see their score, qualification data, and full conversation thread. Agents know exactly who's worth calling — and who isn't.",
    details: [
      "Sortable by score, status, source, and move-in date",
      "Full SMS thread visible per lead",
      "One-click status updates",
      "Activity log for every AI action",
    ],
    side: "Mock: lead dashboard",
  },
  {
    step: "05",
    title: "AI pushes toward a tour",
    desc: "When a lead is warm, the AI suggests tour times and pushes toward scheduling. After the tour, it sends an application link. You close — Bulldog does the heavy lifting.",
    details: [
      "Tour suggestion triggered by score and engagement",
      "Application link sent automatically after tour",
      "Follow-up sequences for cold leads",
      "Pipeline status updated automatically",
    ],
    side: "Mock: tour scheduling",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-20 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-[#C8102E]/10 blur-[100px]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#C8102E]">How It Works</p>
          <h1 className="mb-6 text-5xl font-black tracking-tight md:text-6xl">
            Set up in minutes.<br />
            <span className="text-[#C8102E]">Convert for months.</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            From the first lead to the signed lease — here's how LeaseUp Bulldog turns your lead pipeline into a conversion machine.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl space-y-12">
          {STEPS.map((step, i) => (
            <div
              key={step.step}
              className={`grid gap-8 md:grid-cols-2 ${i % 2 === 1 ? "md:[&>*:first-child]:order-last" : ""}`}
            >
              {/* Content */}
              <div className="flex flex-col justify-center">
                <p className="mb-3 text-5xl font-black text-[#C8102E]/20">{step.step}</p>
                <h2 className="mb-4 text-2xl font-black text-white">{step.title}</h2>
                <p className="mb-6 text-gray-400 leading-relaxed">{step.desc}</p>
                <ul className="space-y-2.5">
                  {step.details.map((d) => (
                    <li key={d} className="flex items-start gap-2.5 text-sm text-gray-400">
                      <span className="mt-0.5 shrink-0 text-[#C8102E]">✓</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual mock */}
              <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6 flex items-center justify-center min-h-[240px]">
                {step.step === "01" && (
                  <div className="w-full space-y-3">
                    {["Sunrise Apartments · Las Vegas", "The Grove at Henderson", "Skyline Flats · Summerlin"].map((p, idx) => (
                      <div key={p} className="flex items-center justify-between rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-white">{p}</p>
                          <p className="text-xs text-gray-500">+1 702 555 01{String(idx).padStart(2, "0")}</p>
                        </div>
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">Active</span>
                      </div>
                    ))}
                  </div>
                )}
                {step.step === "02" && (
                  <div className="w-full max-w-xs space-y-3">
                    {[
                      { from: "Lead", msg: "Hi! I saw your listing on Zillow for a 2BR", time: "9:00 AM" },
                      { from: "Bulldog AI", msg: "Hey Jordan! Thanks for reaching out to Sunrise Apartments 🏠 We have some great 2BRs available. When are you looking to move in?", time: "9:00 AM" },
                      { from: "Lead", msg: "Hoping for August 1st", time: "9:02 AM" },
                    ].map((msg) => (
                      <div key={msg.msg} className={`flex ${msg.from === "Lead" ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${msg.from === "Lead" ? "bg-[#1E1E2E] text-gray-300" : "bg-[#C8102E]/20 text-gray-200"}`}>
                          <p>{msg.msg}</p>
                          <p className="mt-1 text-[10px] text-gray-500">{msg.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {step.step === "03" && (
                  <div className="w-full space-y-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-600">Qualification Data</p>
                    {[
                      ["Move-in Date", "Aug 1, 2025"],
                      ["Unit Type", "2 Bedroom"],
                      ["Budget", "$1,800 – $2,200"],
                      ["Pets", "No"],
                      ["AI Score", "8 / 10"],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-2.5 text-sm">
                        <span className="text-gray-500">{label}</span>
                        <span className={`font-semibold ${label === "AI Score" ? "text-green-400" : "text-white"}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}
                {step.step === "04" && (
                  <div className="w-full space-y-2">
                    {[
                      { name: "Jordan Ellis", score: 8, status: "Engaged", color: "text-violet-400 bg-violet-400/10" },
                      { name: "Carlos Reyes", score: 7, status: "Tour Scheduled", color: "text-amber-400 bg-amber-400/10" },
                      { name: "Maya Thompson", score: 5, status: "Contacted", color: "text-blue-400 bg-blue-400/10" },
                      { name: "Derek Nguyen", score: 2, status: "Lost", color: "text-gray-500 bg-gray-500/10" },
                    ].map((lead) => (
                      <div key={lead.name} className="flex items-center justify-between rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-2.5 text-sm">
                        <span className="font-medium text-white">{lead.name}</span>
                        <span className={`mr-4 font-bold ${lead.score >= 7 ? "text-green-400" : lead.score >= 4 ? "text-yellow-400" : "text-red-400"}`}>{lead.score}/10</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lead.color}`}>{lead.status}</span>
                      </div>
                    ))}
                  </div>
                )}
                {step.step === "05" && (
                  <div className="w-full space-y-3">
                    <div className="rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/5 p-4 text-center">
                      <p className="text-xs text-gray-500 mb-1">AI message to Jordan</p>
                      <p className="text-sm text-gray-300 italic">&ldquo;Great news, Jordan! We have a 2BR available on Aug 1. Would you like to tour this Saturday at 11am or Sunday at 2pm?&rdquo;</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-[#1E1E2E] bg-[#16161F] p-3 text-center">
                        <p className="text-xs text-gray-500">Tours Booked</p>
                        <p className="text-2xl font-black text-white">31</p>
                      </div>
                      <div className="rounded-lg border border-[#1E1E2E] bg-[#16161F] p-3 text-center">
                        <p className="text-xs text-gray-500">Conv. Rate</p>
                        <p className="text-2xl font-black text-[#C8102E]">68%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-[#10101A] px-6 py-20 text-center border-y border-[#1E1E2E]">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[600px] rounded-full bg-[#C8102E]/10 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-xl">
          <h2 className="mb-5 text-4xl font-black">See it in action.</h2>
          <p className="mb-8 text-gray-400">Start your 14-day pilot for $1,000 setup and have your first AI conversation live in under 10 minutes.</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/free-trial"
              className="rounded-xl bg-[#C8102E] px-8 py-4 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors shadow-lg shadow-[#C8102E]/25"
            >
              Start Free Trial →
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border border-[#1E1E2E] px-8 py-4 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
