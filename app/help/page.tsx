// Help center — categorized articles for operators.
// Static content for now (no CMS) — edit this file to add/update articles.

import Link from "next/link";

interface Article {
  slug:    string;
  title:   string;
  summary: string;
  body:    string[];
}

interface Category {
  title:    string;
  icon:     string;
  articles: Article[];
}

const CATEGORIES: Category[] = [
  {
    title: "Getting started",
    icon:  "🚀",
    articles: [
      {
        slug:    "first-property",
        title:   "How do I add my first property?",
        summary: "Add a property and LUB will provision a dedicated AI phone number for it.",
        body: [
          "Click 'Properties' in the left sidebar, then '+ New Property'.",
          "Fill in name, address, ZIP. The city you enter determines what local Twilio number gets provisioned.",
          "Once saved, you'll see a phone number assigned to the property. This is the number leads will text — and the number your AI replies from.",
          "Tip: If you have multiple properties, each gets its own dedicated number so leads route to the right AI context automatically.",
        ],
      },
      {
        slug:    "connect-leads",
        title:   "How do I get leads to flow into LUB?",
        summary: "Paste your unique webhook URL into Zillow, Apartments.com, your website form, or any other lead source.",
        body: [
          "Open the Integrations tab. Your webhook URL is at the top — it looks like https://your-domain.com/api/leads/webhook?property_id=...",
          "Paste this URL into:",
          "  • Zillow Rental Manager → Lead Notification → Webhook",
          "  • Apartments.com → CRM Integration → POST URL",
          "  • Your website form action attribute (or your form-builder's webhook setting)",
          "  • Any Zapier zap → Webhook by Zapier action",
          "Within 60 seconds of any lead arriving, LUB sends an AI-generated welcome SMS and starts the qualification conversation.",
        ],
      },
    ],
  },

  {
    title: "Leads + AI",
    icon:  "💬",
    articles: [
      {
        slug:    "how-ai-works",
        title:   "How does the AI decide what to text?",
        summary: "AI reads each lead's data + property context, then generates a tailored SMS.",
        body: [
          "When a lead arrives, the AI is given:",
          "  • The lead's name, source, move-in date, budget, and any message they sent",
          "  • Your property's name, address, current specials, available unit types, and rent ranges",
          "  • Your custom AI configuration: pet policy, parking info, approved FAQs, escalation triggers",
          "It then generates a 1-2 sentence reply that's friendly, asks the right follow-up question, and never makes claims you haven't approved.",
          "You can customize the AI's behavior per-property at Properties → [your property] → AI Configuration.",
        ],
      },
      {
        slug:    "human-takeover",
        title:   "When should I take over from the AI?",
        summary: "The AI flags hot leads, complaints, and complex questions for you.",
        body: [
          "The AI runs on every lead by default. It will automatically pause itself and create a 'handoff event' in 4 cases:",
          "  • Hot lead: lead asks to schedule a tour ASAP, or wants to apply now",
          "  • Complex question: rent for a specific unit, ETA on availability, custom amenities",
          "  • Complaint: lead seems frustrated or upset",
          "  • Escalation trigger you defined: anything you flagged in your AI config",
          "When the AI hands off, you'll get an email + see the handoff in the Leads tab. You can either reply manually (AI stays paused) or unpause the AI from the lead detail page.",
        ],
      },
      {
        slug:    "lead-not-replying",
        title:   "What happens if a lead doesn't respond?",
        summary: "LUB follows up automatically — burst sequence, then daily, then weekly.",
        body: [
          "Without you doing anything, LUB will:",
          "  • 1 hour after no reply → send a gentle follow-up",
          "  • 4 hours later → check in again with new info",
          "  • 24 hours later → final attempt with a different angle",
          "  • Stops if the lead replies, opts out, or is marked Lost",
          "If a tour gets booked, follow-ups stop automatically. If the lead becomes 'Won', they're removed from the active queue.",
          "You can adjust the follow-up timing per property at Settings → Automations.",
        ],
      },
    ],
  },

  {
    title: "Tours + Leases",
    icon:  "📅",
    articles: [
      {
        slug:    "tour-flow",
        title:   "How do tours get scheduled?",
        summary: "When a lead asks for a tour, AI offers times and books on confirmation.",
        body: [
          "When a lead says 'can I tour this Saturday' or similar, the AI proposes 2-3 specific times based on your office hours.",
          "Once they pick a time, the AI confirms the booking, adds it to your Calendar tab, and sends a confirmation SMS.",
          "Two automated reminders fire:",
          "  • 24 hours before → reminder SMS",
          "  • 2 hours after the tour ends → 'How did it go?' check-in",
          "  • 26 hours after the tour → application nudge ('Ready to apply?')",
        ],
      },
      {
        slug:    "lease-attribution",
        title:   "How does the performance fee get triggered?",
        summary: "Mark a lease 'signed' and LUB checks attribution automatically.",
        body: [
          "Open the lead's detail page → click 'Mark Lease Signed' in the top right.",
          "Fill in lease signed date, monthly rent, and the lease term.",
          "LUB checks if the lease was signed within 30 days of the AI's first contact. If yes, the $200 (or $150 / $100 depending on plan) performance fee is added to your next monthly invoice.",
          "If the lease wasn't AI-attributable (came from a referral, walk-in, etc.), select 'Came from another source' and no fee is charged.",
          "All decisions are logged in the Activity tab for audit.",
        ],
      },
    ],
  },

  {
    title: "Billing",
    icon:  "💳",
    articles: [
      {
        slug:    "what-am-i-paying-for",
        title:   "What am I paying for?",
        summary: "Monthly platform fee + per-lease performance fee for LUB-attributed leases.",
        body: [
          "Monthly platform fee:",
          "  • Starter ($500/mo): up to 3 properties",
          "  • Pro ($1,500/mo): up to 20 properties",
          "  • Portfolio ($3,000/mo): unlimited properties",
          "Performance fee per LUB-attributed lease:",
          "  • Starter: $200/lease",
          "  • Pro: $150/lease",
          "  • Portfolio: $100/lease",
          "A lease is LUB-attributed when the lead first heard from your AI within 30 days before signing. If you mark it as a different source, no fee is charged.",
          "All fees show up as line items on your Stripe invoice on the 1st of each month.",
        ],
      },
      {
        slug:    "cancel-or-refund",
        title:   "How do I cancel or get a refund?",
        summary: "Cancel anytime, no contracts. 30-day results guarantee on first month.",
        body: [
          "To cancel: Settings → Billing → Manage Subscription → Cancel.",
          "Cancellation takes effect at the end of your current billing cycle — you keep access through the date you've already paid for.",
          "30-day results guarantee: If LUB doesn't qualify at least 20 leads in your first 30 days, email yannickngongo14@gmail.com with your operator ID and we'll refund your first month, no questions asked.",
        ],
      },
    ],
  },

  {
    title: "Privacy + Compliance",
    icon:  "🔒",
    articles: [
      {
        slug:    "tcpa",
        title:   "Is LUB TCPA-compliant?",
        summary: "Yes — opt-out detection is automatic and immutable.",
        body: [
          "Every inbound message is scanned for opt-out keywords (STOP, UNSUBSCRIBE, CANCEL, etc.). When detected, the lead is immediately marked opt_out=true and all future outbound is blocked at the database level.",
          "Consent is established at the source — when a prospect submits their phone number to a public lead form (Zillow, your website, etc.), that's the consent record.",
          "Each lead's audit trail is visible on their detail page: ingestion timestamp, source, IP address, user-agent.",
          "If you're considering enterprise customers or have specific compliance questions, work with a TCPA attorney before launching paid campaigns.",
        ],
      },
      {
        slug:    "data-retention",
        title:   "How long is lead data kept?",
        summary: "Active leads forever; opt-out leads purged after 365 days.",
        body: [
          "Active and won leads: kept indefinitely so you have a full history.",
          "Opt-out leads: their phone number, conversations, and personal data are auto-deleted 365 days after the opt-out date by a weekly retention cron.",
          "GDPR delete: from any lead detail page → Delete → confirms with a data_deletion_log entry for compliance proof.",
        ],
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-xs text-gray-400 hover:text-white">← Home</Link>
        <h1 className="mt-4 text-4xl font-black mb-2">Help Center</h1>
        <p className="text-gray-400 mb-12">
          Common questions, organized by topic. If you don&apos;t find an answer,{" "}
          <Link href="/contact" className="text-[#C8102E] hover:underline">contact support</Link>.
        </p>

        {/* Quick nav */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-10">
          {CATEGORIES.map(c => (
            <a
              key={c.title}
              href={`#${c.title.toLowerCase().replace(/\s+/g, "-")}`}
              className="rounded-xl border border-[#1E1E2E] bg-[#10101A] p-3 text-sm text-gray-300 hover:border-[#C8102E] hover:text-white transition-colors flex items-center gap-2"
            >
              <span>{c.icon}</span>
              <span>{c.title}</span>
            </a>
          ))}
        </div>

        {/* Articles */}
        {CATEGORIES.map(c => (
          <section
            key={c.title}
            id={c.title.toLowerCase().replace(/\s+/g, "-")}
            className="mb-12 scroll-mt-8"
          >
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-4 flex items-center gap-2">
              <span>{c.icon}</span>{c.title}
            </h2>
            <div className="space-y-4">
              {c.articles.map(a => (
                <details
                  key={a.slug}
                  id={a.slug}
                  className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] open:bg-[#13131F]"
                >
                  <summary className="cursor-pointer px-6 py-4 select-none">
                    <p className="font-bold text-white inline">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{a.summary}</p>
                  </summary>
                  <div className="px-6 pb-6 pt-2 space-y-3 text-sm text-gray-300 leading-relaxed">
                    {a.body.map((para, i) => (
                      para.startsWith("  •")
                        ? <p key={i} className="ml-4">{para}</p>
                        : <p key={i}>{para}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        {/* Footer CTA */}
        <div className="rounded-2xl border border-[#C8102E]/20 bg-[#C8102E]/5 p-6 mt-12 text-center">
          <p className="font-bold text-white mb-2">Still stuck?</p>
          <p className="text-sm text-gray-400 mb-4">
            We respond to every support email within 4 business hours.
          </p>
          <Link
            href="/contact"
            className="inline-block rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
          >
            Contact support →
          </Link>
        </div>
      </div>
    </div>
  );
}
