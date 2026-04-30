// Public FAQ page — top 30 questions prospects ask before signing up.
// Different audience from /help (which is for existing customers).

import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

interface QA { q: string; a: string; }
interface Section { title: string; items: QA[]; }

const FAQ: Section[] = [
  {
    title: "Pricing & billing",
    items: [
      { q: "How much does LUB cost?", a: "Three plans: Starter ($500/mo for up to 3 properties), Pro ($1,500/mo for up to 20), Portfolio ($3,000/mo unlimited). Plus a per-lease performance fee ($100-200) when LUB-attributed leads sign — you only pay for actual results." },
      { q: "Is there a free trial?", a: "Yes — 14-day free trial on every plan. No credit card required to start. The performance fee only kicks in if you actually close a lease, so the trial costs you nothing." },
      { q: "What's the performance fee for?", a: "You pay a flat fee ($200 on Starter, $150 on Pro, $100 on Portfolio) every time a lease is signed by someone the AI first contacted within 30 days. If LUB didn't generate the lead, no fee." },
      { q: "Can I cancel anytime?", a: "Yes. No contracts. Cancellation takes effect at the end of your current billing cycle, and there are no early-termination fees ever." },
      { q: "Is there a setup fee?", a: "No setup fee. Onboarding, Twilio number provisioning, AI configuration, and a kickoff call are all included in your first month." },
      { q: "What's the 30-day results guarantee?", a: "If LUB doesn't qualify at least 20 leads in your first 30 days, we refund your first month — no questions asked." },
      { q: "How am I billed for SMS?", a: "All inbound and outbound SMS is included in your platform fee. Twilio costs are absorbed by us. There are no per-message charges to you." },
    ],
  },
  {
    title: "Product & AI",
    items: [
      { q: "How fast does the AI respond to a lead?", a: "Under 60 seconds. Industry data: leads contacted within 5 minutes are 9x more likely to convert than after 30 minutes. LUB texts within 60 seconds, 24/7, including weekends and 2 AM." },
      { q: "What does the AI actually say to a lead?", a: "It greets them by name, references the property they inquired about, asks 1-2 qualification questions (move-in date, budget, bedroom count), and proactively offers tour times. You configure tone, allowed claims, and approved FAQs per property." },
      { q: "Can the AI hurt my brand?", a: "It's heavily constrained: never makes pricing claims you haven't approved, never invents amenities, never promises specific units. It can only say things you've configured in the property's AI Configuration. If unsure, it escalates to you." },
      { q: "What languages does the AI support?", a: "English by default. Spanish reply detection is built in — if a lead replies in Spanish, the AI continues in Spanish." },
      { q: "Can I take over from the AI mid-conversation?", a: "Yes. Click any lead, hit 'Take Over' — AI pauses, you reply manually. Resume AI anytime." },
      { q: "Does the AI book tours automatically?", a: "Yes. When a lead asks for a tour, the AI proposes 2-3 specific times based on your office hours and books on confirmation. Reminders fire 24 hours before and a check-in 2 hours after." },
    ],
  },
  {
    title: "Setup & integrations",
    items: [
      { q: "How long does setup take?", a: "Most operators are live in under 15 minutes. Steps: create your account, add your first property (we provision a Twilio number), paste your webhook URL into Zillow / Apartments.com / your website, send a test lead." },
      { q: "What lead sources can I connect?", a: "Zillow Rental Manager, Apartments.com, AppFolio (via Zapier), Facebook Lead Ads, your website form, custom webhooks, manual CSV import, HubSpot CRM. Anything that can POST a webhook." },
      { q: "Do I need to change my phone number?", a: "No. LUB provisions a brand-new dedicated Twilio number per property. Your existing business line is untouched. The new number is what leads text — and what your AI replies from." },
      { q: "What CRMs do you sync with?", a: "HubSpot is built in (private app token paste). Salesforce, AppFolio, Yardi, RealPage are coming via Zapier. Custom CRMs via webhooks." },
      { q: "Can I keep my existing leasing tools?", a: "Yes. LUB sits on top of whatever you use. Zillow, your website, your CRM — they all keep working. LUB just makes sure every lead gets answered within 60 seconds and pushes status updates back to your CRM." },
    ],
  },
  {
    title: "Compliance & data",
    items: [
      { q: "Is LUB TCPA-compliant?", a: "Yes. Opt-out detection runs on every inbound message — STOP/UNSUBSCRIBE/CANCEL keywords trigger immediate, immutable opt-out. Per-lead consent audit trail (timestamp, source, IP) is visible on every lead detail page." },
      { q: "Do you sell my data?", a: "Never. Your leads, conversations, and analytics belong to you. We don't sell, share, or use your data to train external models. Full data export available anytime." },
      { q: "What happens to data when I cancel?", a: "On cancellation: 90-day grace period to export, then your data is permanently deleted. You can request immediate deletion at any time." },
      { q: "Is my data backed up?", a: "Yes. Daily automated backups via Supabase, retained 30 days. Point-in-time recovery available." },
      { q: "Are you SOC 2 certified?", a: "Working toward SOC 2 Type 1 — should complete in early 2026. Until then we follow industry best practices: encrypted at rest + in transit, principle of least privilege, audit logs on every action." },
    ],
  },
  {
    title: "Pilot & onboarding",
    items: [
      { q: "Can I pilot with just one property?", a: "Yes. Most operators start with their hardest-to-fill property. Once they see the response time and qualification quality, they roll out to the rest." },
      { q: "How long does a typical pilot run?", a: "30 days. By day 30, our average pilot operator has seen 200+ leads qualified, 40+ tours booked, and 5-10 leases signed via the AI." },
      { q: "What's required from me to onboard?", a: "About 60 minutes total: 15 min to create the account + add your first property, 15 min to paste webhooks into your lead sources, 15 min to configure the AI's voice and approved claims, 15 min for a kickoff call with us." },
      { q: "Do I need to train my team?", a: "Optional. The dashboard is straightforward and most operators figure it out without training. We offer free 30-min team training over Zoom on request." },
      { q: "What if my team doesn't like it?", a: "You can pause the AI on any property anytime. The fundamental contract is: we make your team's life easier by handling the after-hours grind. They keep doing what they do best — closing tours and handling complex situations." },
    ],
  },
  {
    title: "Marketing add-on (Coming Soon)",
    items: [
      { q: "What's the marketing add-on?", a: "AI-generated Facebook + Instagram + Google ad campaigns. You pick a property, AI writes the strategy + copy + creative, you approve, and the ads launch directly from LUB. Every lead from those ads goes through the same AI qualification flow." },
      { q: "Why is it 'Coming Soon'?", a: "We're finalizing our Meta partnership before opening it up. Existing operators get first access — join the waitlist on the Marketing tab and we'll email you the day it launches." },
      { q: "How much does it cost?", a: "$500/mo + 5% of actual ad spend (billed monthly). Example: if you spend $5K/mo on ads, your fee is $500 + $250 = $750. We don't take any markup on the ad platform — you pay Meta/Google directly for spend." },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen text-white">
      <MarketingNav />
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-2">FAQ</p>
          <h1 className="text-4xl font-black mb-3">Common questions</h1>
          <p className="text-gray-400 mb-12">
            Don&apos;t see your question? <Link href="/contact" className="text-[#C8102E] hover:underline">Contact us</Link> — we reply within 4 hours on weekdays.
          </p>

          {FAQ.map(section => (
            <div key={section.title} className="mb-10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">{section.title}</h2>
              <div className="space-y-3">
                {section.items.map(({ q, a }) => (
                  <details key={q} className="rounded-xl border border-[#1E1E2E] bg-[#10101A] open:bg-[#13131F]">
                    <summary className="cursor-pointer px-5 py-4 font-semibold text-white select-none">
                      {q}
                    </summary>
                    <p className="px-5 pb-5 pt-1 text-sm text-gray-400 leading-relaxed">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-12 rounded-2xl border border-[#C8102E]/20 bg-[#C8102E]/5 p-6 text-center">
            <p className="font-bold text-white mb-1">Ready to try it?</p>
            <p className="text-sm text-gray-400 mb-4">14-day free trial. No setup fee. Cancel anytime.</p>
            <Link href="/free-trial" className="inline-block rounded-xl bg-[#C8102E] px-6 py-3 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors">
              Start your 14-day pilot →
            </Link>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
