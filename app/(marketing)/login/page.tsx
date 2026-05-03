"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

function LoginForm() {
  const router      = useRouter();
  const params      = useSearchParams();
  const inviteToken = params.get("invite_token") ?? "";
  const isInvite    = Boolean(inviteToken);

  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError } = await getSupabase().auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (isInvite) {
      await fetch("/api/org/accept-invite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token: inviteToken }),
      });
    }

    router.push("/dashboard");
  }

  async function handleGoogle() {
    setError(null);
    const redirectTo = inviteToken
      ? `${window.location.origin}/auth/callback?invite_token=${encodeURIComponent(inviteToken)}`
      : `${window.location.origin}/auth/callback`;
    const { error: oauthError } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options:  { redirectTo },
    });
    if (oauthError) setError(oauthError.message);
  }

  const signupHref = isInvite ? `/signup?invite_token=${encodeURIComponent(inviteToken)}` : "/signup";

  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans flex flex-col">
      <header className="sticky top-0 z-50 border-b border-[#1E1E2E] bg-[#08080F]/90 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="inline-block h-2 w-2 rounded-full bg-[#C8102E] pulse-dot" />
            <span className="text-white">LeaseUp <span className="text-[#C8102E]">Bulldog</span></span>
          </Link>
          <p className="text-sm font-medium text-gray-300">
            Don&apos;t have an account?{" "}
            <Link href={signupHref} className="text-[#F87171] hover:text-white transition-colors">Sign up free</Link>
          </p>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-16">
        {/* Subtle ambient bg */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 h-[420px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(200,16,46,0.18) 0%, transparent 70%)", filter: "blur(80px)" }}
          />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `linear-gradient(rgba(200,16,46,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(200,16,46,0.08) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
              maskImage: `radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)`,
              WebkitMaskImage: `radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)`,
            }}
          />
        </div>

        <div className="relative w-full max-w-md">
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8 transition-all duration-300 hover:border-[#C8102E]/40 hover:shadow-[0_0_60px_rgba(200,16,46,0.2)]">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-black">Welcome back.</h1>
              <p className="mt-2 text-sm text-gray-500">
                {isInvite ? "Log in to accept your team invitation" : "Log in to your operator dashboard"}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
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

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-400">Password</label>
                  <Link href="/forgot-password" className="text-xs text-[#C8102E] hover:underline">Forgot password?</Link>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {loading ? "Logging in…" : isInvite ? "Log In & Join Team →" : "Log In →"}
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
              New to LeaseUp Bulldog?{" "}
              <Link href={signupHref} className="text-[#C8102E] hover:underline">Start your free trial</Link>
            </p>
            <p className="mt-4 text-center text-[10px] text-gray-500">
              By signing in you agree to our{" "}
              <Link href="/terms" className="hover:underline">Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#08080F]" />}>
      <LoginForm />
    </Suspense>
  );
}
