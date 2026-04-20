"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();

  const inviteToken = params.get("invite_token") ?? "";
  const inviteEmail = params.get("invite_email") ?? "";
  const isInvite    = Boolean(inviteToken);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [company, setCompany]     = useState("");
  const [email, setEmail]         = useState(inviteEmail);
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => { if (inviteEmail) setEmail(inviteEmail); }, [inviteEmail]);

  const [verified, setVerified] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Build the callback URL so the auth callback can accept the invite after email verification
    const callbackBase = `${window.location.origin}/auth/callback`;
    const emailRedirectTo = isInvite
      ? `${callbackBase}?invite_token=${encodeURIComponent(inviteToken)}`
      : callbackBase;

    const { data, error: signUpError } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data:            { full_name: `${firstName} ${lastName}`.trim(), company },
        emailRedirectTo,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If Supabase immediately issued a session (email confirm disabled), accept invite now
    if (data.session) {
      if (isInvite) {
        await fetch("/api/org/accept-invite", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ token: inviteToken }),
        });
      }
      router.push("/dashboard");
      return;
    }

    // Email confirmation required — show "check your email" message
    setLoading(false);
    setVerified(true);
  }

  async function handleGoogle() {
    const redirectTo = inviteToken
      ? `${window.location.origin}/auth/callback?invite_token=${encodeURIComponent(inviteToken)}`
      : `${window.location.origin}/auth/callback`;
    await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options:  { redirectTo },
    });
  }

  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans flex flex-col">
      {verified && (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-10 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#C8102E]/10">
              <svg className="h-8 w-8 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-black">Check your email</h2>
            <p className="text-sm text-gray-500">
              We sent a verification link to <strong className="text-white">{email}</strong>.
              Click it to confirm your account{isInvite ? " and join the team" : ""}.
            </p>
          </div>
        </div>
      )}
      {!verified && <><header className="border-b border-[#1E1E2E] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </Link>
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link href={`/login${inviteToken ? `?invite_token=${encodeURIComponent(inviteToken)}` : ""}`} className="text-[#C8102E] hover:underline font-medium">Log in</Link>
          </p>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="relative w-full max-w-md">
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[500px] rounded-full bg-[#C8102E]/10 blur-[80px]" />

          <div className="relative rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-black">{isInvite ? "Create your account." : "Create your account."}</h1>
              <p className="mt-2 text-sm text-gray-500">
                {isInvite ? "Set up your account to join the team" : "Start converting leads in minutes"}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-400">First Name</label>
                  <input type="text" placeholder="Marcus" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-400">Last Name</label>
                  <input type="text" placeholder="Thompson" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-400">Email</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={isInvite}
                  className={`w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none ${isInvite ? "opacity-60 cursor-not-allowed" : ""}`}
                />
                {isInvite && <p className="mt-1 text-xs text-gray-600">This must match the email the invitation was sent to.</p>}
              </div>

              {!isInvite && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-400">Company / Portfolio Name</label>
                  <input type="text" placeholder="Sunrise Properties LLC" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-400">Password</label>
                <input type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none" />
              </div>

              {error && (
                <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-xs text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 block w-full rounded-xl bg-[#C8102E] py-3.5 text-center text-sm font-bold text-white hover:bg-[#A50D25] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account…" : isInvite ? "Create Account & Join Team →" : "Create Account →"}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#1E1E2E]" />
              <span className="text-xs text-gray-600">or</span>
              <div className="h-px flex-1 bg-[#1E1E2E]" />
            </div>

            <button
              onClick={handleGoogle}
              className="mt-4 w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] py-3.5 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <p className="mt-6 text-center text-xs text-gray-600">
              By creating an account you agree to our{" "}
              <a href="#" className="text-gray-500 hover:underline">Terms</a> and{" "}
              <a href="#" className="text-gray-500 hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </>}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#08080F]" />}>
      <SignupForm />
    </Suspense>
  );
}
