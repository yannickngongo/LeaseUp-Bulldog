"use client";

import { useState } from "react";

export function PricingPageWaitlist() {
  const [email, setEmail]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState("");

  async function handleSubmit() {
    if (!email.trim()) { setError("Email required"); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketing-waitlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), source: "pricing_page" }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to join"); return; }
      setSubmitted(true);
    } catch { setError("Network error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="shrink-0 rounded-xl border border-amber-800/30 bg-amber-900/20 p-4 min-w-[260px]">
      {submitted ? (
        <div className="text-center py-2">
          <p className="text-amber-400 text-lg mb-1">✓</p>
          <p className="text-xs font-bold text-white">You&apos;re on the list</p>
          <p className="text-[10px] text-gray-500 mt-1">We&apos;ll email you at launch</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Coming Soon</p>
          <p className="text-[11px] text-gray-400 leading-relaxed mb-2">Get notified when the Marketing Add-On launches.</p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-amber-800/30 bg-[#0a0a12] px-2.5 py-2 text-xs text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !email.trim()}
            className="w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-[#0a0a12] hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Adding…" : "Notify me"}
          </button>
          {error && <p className="text-[10px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
