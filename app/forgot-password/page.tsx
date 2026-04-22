"use client";
import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const origin = window.location.origin;
    const { error: authError } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?type=recovery`,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans flex flex-col">
      <header className="border-b border-[#1E1E2E] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to login
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="relative w-full max-w-md">
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[500px] rounded-full bg-[#C8102E]/10 blur-[80px]" />

          <div className="relative rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8">
            {submitted ? (
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 border border-green-500/30">
                  <svg className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black mb-2">Check your email</h2>
                <p className="text-sm text-gray-400 mb-6">
                  We sent a reset link to <strong className="text-white">{email}</strong>. Click it to set a new password.
                </p>
                <p className="text-xs text-gray-600">
                  Didn&apos;t get it? Check your spam folder, or{" "}
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-[#C8102E] hover:underline"
                  >
                    try again
                  </button>.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-8 text-center">
                  <h1 className="text-3xl font-black">Reset your password</h1>
                  <p className="mt-2 text-sm text-gray-500">
                    Enter your email and we&apos;ll send you a reset link.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-400">Email</label>
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                    />
                  </div>

                  {error && (
                    <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-xs text-red-400">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 block w-full rounded-xl bg-[#C8102E] py-3.5 text-center text-sm font-bold text-white hover:bg-[#A50D25] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending…" : "Send Reset Link →"}
                  </button>
                </form>

                <p className="mt-6 text-center text-xs text-gray-600">
                  Remembered it?{" "}
                  <Link href="/login" className="text-[#C8102E] hover:underline">Back to login</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
