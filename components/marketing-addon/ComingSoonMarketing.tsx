"use client";

import { useEffect, useState } from "react";
import { getOperatorEmail } from "@/lib/demo-auth";

const FEATURES = [
  {
    title: "AI Campaign Builder",
    desc:  "Pick a property → AI generates the full ad strategy, headlines, body copy, and CTA across Facebook, Instagram, and Google.",
    icon:  "✨",
  },
  {
    title: "Offer Lab",
    desc:  "Type any offer idea — AI grades it against the local market and suggests what would convert better.",
    icon:  "🎯",
  },
  {
    title: "Budget Forecast",
    desc:  "Per-channel forecasts show expected leads, cost per lease, and occupancy lift before you spend a dollar.",
    icon:  "📊",
  },
  {
    title: "One-Click Launch",
    desc:  "Approve your ad variations, set a budget, and go live on Meta or Google directly from LUB.",
    icon:  "🚀",
  },
  {
    title: "Auto Lead Qualification",
    desc:  "Every lead from your ads gets an AI text within 60 seconds — even at 2am, even on Christmas.",
    icon:  "💬",
  },
  {
    title: "Real-Time Performance",
    desc:  "Daily spend sync, what-if simulations, and campaign optimization recommendations — all in one place.",
    icon:  "📈",
  },
];

export function ComingSoonMarketing() {
  const [email, setEmail]               = useState("");
  const [propertyCount, setPropertyCount] = useState<string>("");
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState("");
  const [count, setCount]               = useState<number | null>(null);

  useEffect(() => {
    // Auto-fill from logged-in operator
    getOperatorEmail().then((e) => { if (e) setEmail(e); });
    // Load social-proof count
    fetch("/api/marketing-waitlist").then(r => r.json()).then(j => setCount(j.count ?? 0)).catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!email.trim()) { setError("Email required"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res  = await fetch("/api/marketing-waitlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:         email.trim(),
          propertyCount: propertyCount ? parseInt(propertyCount, 10) : undefined,
          source:        "marketing_tab",
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to join waitlist"); return; }
      setSubmitted(true);
      setCount(c => (c ?? 0) + 1);
    } catch { setError("Network error — try again"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Hero */}
        <div className="mb-8 rounded-2xl border border-[#C8102E]/30 bg-gradient-to-br from-[#C8102E]/10 via-[#C8102E]/5 to-transparent p-8 text-center">
          <span className="inline-block mb-4 rounded-full bg-[#C8102E]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#C8102E]">
            Coming Soon
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-gray-100 mb-3">
            Marketing Add-On
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            AI builds your full ad strategy across Facebook, Instagram, and Google — then launches it for you, qualifies every lead, and reports back. <strong className="text-gray-800 dark:text-gray-200">$500/mo + 5% of ad spend.</strong> Launching soon.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-5">
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className="font-bold text-gray-900 dark:text-gray-100 mb-1">{f.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Waitlist signup */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-8">
          {submitted ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl dark:bg-green-900/30 dark:text-green-400">✓</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">You&apos;re on the list</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We&apos;ll email <strong className="text-gray-700 dark:text-gray-300">{email}</strong> the moment the Marketing Add-On goes live.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Join the waitlist</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Be the first to know when the Marketing Add-On is live.
                  {count != null && count > 0 && (
                    <> <span className="font-semibold text-[#C8102E]">{count.toLocaleString()} {count === 1 ? "operator" : "operators"} already waiting.</span></>
                  )}
                </p>
              </div>

              <div className="space-y-3 max-w-md mx-auto">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Your email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#C8102E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">How many properties? <span className="font-normal text-gray-400">(optional)</span></label>
                  <input
                    type="number"
                    min={0}
                    value={propertyCount}
                    onChange={e => setPropertyCount(e.target.value)}
                    placeholder="e.g. 3"
                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#C8102E] focus:outline-none"
                  />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !email.trim()}
                  className="w-full rounded-xl bg-[#C8102E] py-3 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ boxShadow: "0 4px 16px rgba(200,16,46,0.25)" }}
                >
                  {submitting ? "Adding you…" : "Notify me when it launches →"}
                </button>
                <p className="text-[11px] text-gray-400 text-center pt-1">
                  No spam. One email when the Marketing Add-On is ready, then you decide.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
