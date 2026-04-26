"use client";

import { useState } from "react";

interface FormState {
  name: string;
  email: string;
  properties: string;
}

export function WaitlistForm() {
  const [form, setForm] = useState<FormState>({ name: "", email: "", properties: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-[#C8102E]/30 bg-[#C8102E]/5 p-8 text-center">
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#C8102E]/10 text-3xl">
          🐶
        </div>
        <h3 className="mb-2 text-xl font-bold text-white">You&apos;re on the list.</h3>
        <p className="text-sm leading-relaxed text-gray-400">
          We&apos;ll reach out within 48 hours to schedule your onboarding call
          and get your pilot live.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#C8102E]/20 bg-[#C8102E]/10 px-4 py-1.5 text-xs font-medium text-[#F87171]">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#C8102E]" />
          Expect a call from our team
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-gray-400">
          Full Name
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Marcus Thompson"
          className="w-full rounded-xl border border-[#1E1E2E] bg-[#10101A] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#C8102E]/60 focus:ring-1 focus:ring-[#C8102E]/30"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-gray-400">
          Work Email
        </label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="you@company.com"
          className="w-full rounded-xl border border-[#1E1E2E] bg-[#10101A] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#C8102E]/60 focus:ring-1 focus:ring-[#C8102E]/30"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-gray-400">
          Properties managed
        </label>
        <select
          required
          value={form.properties}
          onChange={(e) => setForm((f) => ({ ...f, properties: e.target.value }))}
          className="w-full rounded-xl border border-[#1E1E2E] bg-[#10101A] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#C8102E]/60 focus:ring-1 focus:ring-[#C8102E]/30"
        >
          <option value="" disabled>Select range…</option>
          <option value="1-3">1–3 properties</option>
          <option value="4-10">4–10 properties</option>
          <option value="11-25">11–25 properties</option>
          <option value="25+">25+ properties</option>
        </select>
      </div>

      {error && (
        <p className="rounded-lg border border-red-800/40 bg-red-950/20 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#C8102E] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#C8102E]/25 transition-colors hover:bg-[#A50D25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] active:bg-[#8B0B1F] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Joining…" : "Join the Waitlist →"}
      </button>

      <p className="text-center text-xs text-gray-600">
        No spam. No credit card. We&apos;ll reach out personally.
      </p>
    </form>
  );
}
