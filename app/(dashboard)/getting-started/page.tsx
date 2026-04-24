"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getOperatorEmail } from "@/lib/demo-auth";
import { PlatformTour } from "@/components/app/PlatformTour";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepDef {
  id: string;
  title: string;
  desc: string;
  action?: { label: string; href: string };
  plans: ("starter" | "pro" | "portfolio")[];
  requiresMarketing?: boolean;
  autoDetect?: boolean; // inferred from data vs manually checked
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  {
    id: "account",
    title: "Create your account",
    desc: "You're in. Your LeaseUp Bulldog account is active and ready.",
    plans: ["starter", "pro", "portfolio"],
    autoDetect: true,
  },
  {
    id: "property",
    title: "Add your first property",
    desc: "Each property gets its own AI-powered phone number. Leads that text it are handled automatically, 24/7.",
    action: { label: "Go to Properties", href: "/properties" },
    plans: ["starter", "pro", "portfolio"],
    autoDetect: true,
  },
  {
    id: "know_number",
    title: "Find your AI phone number",
    desc: "Every property has a dedicated Twilio number assigned to it. This is the number your AI responds from — prospects text it and LUB takes over.",
    action: { label: "View Properties", href: "/properties" },
    plans: ["starter", "pro", "portfolio"],
    autoDetect: true,
  },
  {
    id: "listings",
    title: "Put your AI number on your listings",
    desc: "Replace the contact number on Zillow, Apartments.com, AppFolio, your website, and yard signs with your LUB property number. This is how leads reach the AI.",
    action: { label: "View Integrations", href: "/integrations" },
    plans: ["starter", "pro", "portfolio"],
    autoDetect: false,
  },
  {
    id: "active_special",
    title: "Set your active special",
    desc: "If you're running a promotion (e.g. \"First month free on 2BR units\"), add it here. The AI will mention it automatically to every prospect that asks.",
    action: { label: "Edit Property", href: "/properties" },
    plans: ["starter", "pro", "portfolio"],
    autoDetect: true,
  },
  {
    id: "lead_source",
    title: "Connect a lead source",
    desc: "Connect Zillow, Apartments.com, AppFolio via Zapier, or Facebook Lead Ads so leads flow in automatically. Or test right now with a manual text.",
    action: { label: "Go to Integrations", href: "/integrations" },
    plans: ["starter", "pro", "portfolio"],
    autoDetect: true,
  },
  {
    id: "test_lead",
    title: "Send a test lead",
    desc: "Text your property's AI number from your personal phone — say something like \"Hi, I'm looking for a 2BR, available June 1\". Watch the AI respond in seconds.",
    action: { label: "View Leads", href: "/leads" },
    plans: ["starter", "pro", "portfolio"],
    autoDetect: true,
  },
  {
    id: "ai_brain",
    title: "Configure the AI Brain",
    desc: "Open any property → AI Brain Configuration. Fill in your unit mix, pricing, amenities, pet policy, and office hours. The more you fill in, the more precisely the AI answers leads — no more 'I'll find out'.",
    action: { label: "Go to Properties", href: "/properties" },
    plans: ["starter", "pro", "portfolio"],
    autoDetect: false,
  },
  {
    id: "rent_roll",
    title: "Sync your Rent Roll for live pricing data",
    desc: "Upload a rent roll CSV on the property page, then click \"↑ Sync from Rent Roll\" in the Unit Mix section to auto-fill pricing, availability, and square footage. Keep it updated monthly.",
    action: { label: "Go to Properties", href: "/properties" },
    plans: ["starter", "pro", "portfolio"],
    autoDetect: false,
  },
  {
    id: "ai_settings",
    title: "Review your AI response settings",
    desc: "Customize how the AI introduces itself, what it says about tours, and when to hand off to a human agent.",
    action: { label: "Go to Automations", href: "/automations" },
    plans: ["starter", "pro", "portfolio"],
    autoDetect: false,
  },
  {
    id: "more_properties",
    title: "Add more properties",
    desc: "Your Pro plan supports up to 20 properties. Each gets its own AI number, dashboard, and lead pipeline.",
    action: { label: "Add Property", href: "/properties" },
    plans: ["pro", "portfolio"],
    autoDetect: true,
  },
  {
    id: "portfolio_view",
    title: "Explore the Portfolio view",
    desc: "See all your properties at a glance — occupancy rates, active leads, and revenue across your entire portfolio in one screen.",
    action: { label: "Go to Portfolio", href: "/portfolio" },
    plans: ["pro", "portfolio"],
    autoDetect: false,
  },
  {
    id: "team",
    title: "Invite your team",
    desc: "Add leasing agents, managers, or admins. Each person gets their own login and role-based access — agents see only their properties.",
    action: { label: "Go to Settings", href: "/settings" },
    plans: ["portfolio"],
    autoDetect: false,
  },
  {
    id: "first_campaign",
    title: "Create your first ad campaign",
    desc: "Your Marketing Add-On is active. Let the AI generate a Facebook or Google campaign for your property — you review and approve before it goes live.",
    action: { label: "Go to Marketing", href: "/marketing" },
    plans: ["starter", "pro", "portfolio"],
    requiresMarketing: true,
    autoDetect: true,
  },
  {
    id: "approve_creative",
    title: "Review your AI ad creative",
    desc: "The AI writes the headline, body copy, offer, and targeting for you. Review it, make edits, and approve. LUB tracks every lead it generates.",
    action: { label: "Go to Marketing", href: "/marketing" },
    plans: ["starter", "pro", "portfolio"],
    requiresMarketing: true,
    autoDetect: false,
  },
];

// ─── Section labels ───────────────────────────────────────────────────────────

const SECTION_MAP: Record<string, string> = {
  account:        "Getting Set Up",
  property:       "Getting Set Up",
  know_number:    "Getting Set Up",
  listings:       "Getting Set Up",
  active_special: "Getting Set Up",
  lead_source:    "Your First Leads",
  test_lead:      "Your First Leads",
  ai_brain:       "Your First Leads",
  rent_roll:      "Your First Leads",
  ai_settings:    "Your First Leads",
  more_properties: "Growing Your Portfolio",
  portfolio_view:  "Growing Your Portfolio",
  team:            "Growing Your Portfolio",
  first_campaign:  "Marketing Add-On",
  approve_creative:"Marketing Add-On",
};

export default function GettingStartedPage() {
  const [plan,          setPlan]          = useState<"starter" | "pro" | "portfolio">("starter");
  const [hasMarketing,  setHasMarketing]  = useState(false);
  const [properties,    setProperties]    = useState<{ id: string; phone_number?: string; active_special?: string }[]>([]);
  const [leadCount,     setLeadCount]     = useState(0);
  const [campaignCount, setCampaignCount] = useState(0);
  const [manualDone,    setManualDone]    = useState<Set<string>>(new Set());
  const [loading,       setLoading]       = useState(true);
  const [operatorName,  setOperatorName]  = useState("");
  const [tourActive,    setTourActive]    = useState(false);

  useEffect(() => {
    // Load manually-checked steps from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("lub_onboarding_done") ?? "[]");
      setManualDone(new Set(saved));
    } catch { /* ignore */ }

    getOperatorEmail().then(async (email) => {
      if (!email) return;
      const [setupRes, leadsRes] = await Promise.all([
        fetch(`/api/setup?email=${encodeURIComponent(email)}`),
        fetch(`/api/leads?email=${encodeURIComponent(email)}&limit=1`),
      ]);
      const setup = await setupRes.json();
      const leadsJson = await leadsRes.json();

      const op = setup.operator;
      if (op) {
        setPlan(op.plan ?? "starter");
        setHasMarketing(op.marketing_addon ?? false);
        setOperatorName(op.name ?? "");
      }
      setProperties(setup.properties ?? []);
      setLeadCount(leadsJson.leads?.length ?? 0);

      if (op?.marketing_addon) {
        try {
          const campRes = await fetch(`/api/campaigns?email=${encodeURIComponent(email)}&limit=1`);
          const campJson = await campRes.json();
          setCampaignCount(campJson.campaigns?.length ?? 0);
        } catch { /* ignore */ }
      }

      setLoading(false);
    });
  }, []);

  function isAutoComplete(stepId: string): boolean {
    switch (stepId) {
      case "account":         return true;
      case "property":        return properties.length > 0;
      case "know_number":     return properties.some(p => !!p.phone_number);
      case "active_special":  return properties.some(p => !!p.active_special);
      case "lead_source":     return leadCount > 0;
      case "test_lead":       return leadCount > 0;
      case "more_properties": return properties.length > 1;
      case "first_campaign":  return campaignCount > 0;
      default:                return false;
    }
  }

  function isDone(step: StepDef): boolean {
    if (step.autoDetect) return isAutoComplete(step.id);
    return manualDone.has(step.id);
  }

  function toggleManual(stepId: string) {
    setManualDone(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      localStorage.setItem("lub_onboarding_done", JSON.stringify([...next]));
      return next;
    });
  }

  const visibleSteps = STEPS.filter(s => {
    if (!s.plans.includes(plan)) return false;
    if (s.requiresMarketing && !hasMarketing) return false;
    return true;
  });

  const doneCount  = visibleSteps.filter(s => isDone(s)).length;
  const totalCount = visibleSteps.length;
  const pct        = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  // Group into sections
  const sections: { label: string; steps: StepDef[] }[] = [];
  let currentLabel = "";
  for (const step of visibleSteps) {
    const label = SECTION_MAP[step.id] ?? "Other";
    if (label !== currentLabel) {
      sections.push({ label, steps: [] });
      currentLabel = label;
    }
    sections[sections.length - 1].steps.push(step);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080F] flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading your setup guide…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080F] text-white p-6 md:p-10">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-2">Setup Guide</p>
            <h1 className="text-3xl font-black mb-2">
              {operatorName ? `Welcome, ${operatorName.split(" ")[0]}` : "Getting Started"}
            </h1>
            <p className="text-gray-400 text-sm">
              Follow these steps to get LeaseUp Bulldog fully set up for your{" "}
              <span className="text-white font-semibold capitalize">{plan}</span> plan
              {hasMarketing && <span className="text-purple-400"> + Marketing Add-On</span>}.
            </p>
          </div>
          <button
            onClick={() => setTourActive(true)}
            className="shrink-0 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <span>🗺️</span> Take the Tour
          </button>
        </div>

        {tourActive && <PlatformTour onFinish={() => setTourActive(false)} />}

        {/* Progress bar */}
        <div className="mb-10 rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">{doneCount} of {totalCount} steps complete</span>
            <span className="text-sm font-bold text-[#C8102E]">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#1E1E2E] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#C8102E] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct === 100 && (
            <p className="mt-3 text-sm text-green-400 font-semibold">
              You&apos;re fully set up. LeaseUp Bulldog is working for you 24/7.
            </p>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.label}>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                {section.label}
              </h2>
              <div className="space-y-3">
                {section.steps.map((step) => {
                  const done = isDone(step);
                  return (
                    <div
                      key={step.id}
                      className={`rounded-xl border p-5 transition-colors ${
                        done
                          ? "border-green-900/40 bg-green-950/10"
                          : "border-[#1E1E2E] bg-[#10101A]"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Check circle */}
                        <button
                          onClick={() => !step.autoDetect && toggleManual(step.id)}
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            done
                              ? "border-green-500 bg-green-500"
                              : "border-[#1E1E2E] bg-transparent hover:border-gray-500"
                          } ${step.autoDetect ? "cursor-default" : "cursor-pointer"}`}
                          title={step.autoDetect ? "Auto-detected" : "Click to mark complete"}
                        >
                          {done && (
                            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-semibold ${done ? "text-gray-400 line-through" : "text-white"}`}>
                              {step.title}
                            </p>
                            {step.requiresMarketing && (
                              <span className="rounded bg-purple-900/40 px-1.5 py-0.5 text-[10px] font-bold text-purple-400">
                                Marketing Add-On
                              </span>
                            )}
                            {!step.plans.includes("starter") && (
                              <span className="rounded bg-[#C8102E]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#C8102E] capitalize">
                                {step.plans[0]}+
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-400 leading-relaxed">{step.desc}</p>

                          <div className="mt-3 flex items-center gap-3 flex-wrap">
                            {step.action && !done && (
                              <Link
                                href={step.action.href}
                                className="rounded-lg bg-[#C8102E] px-4 py-2 text-xs font-bold text-white hover:bg-[#A50D25] transition-colors"
                              >
                                {step.action.label} →
                              </Link>
                            )}
                            {!step.autoDetect && !done && (
                              <button
                                onClick={() => toggleManual(step.id)}
                                className="rounded-lg border border-[#1E1E2E] px-4 py-2 text-xs font-semibold text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
                              >
                                Mark as done
                              </button>
                            )}
                            {step.autoDetect && !done && (
                              <span className="text-xs text-gray-600 italic">Auto-detected when complete</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Help footer */}
        <div className="mt-10 rounded-xl border border-[#1E1E2E] bg-[#10101A] p-5 flex items-start gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/10 text-[#C8102E] text-sm font-bold">?</div>
          <div>
            <p className="font-semibold text-white text-sm">Need help?</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Check the <Link href="/integrations" className="text-[#C8102E] hover:underline">Integrations guide</Link> for platform-specific setup, or text your AI number to test the full flow end-to-end.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
