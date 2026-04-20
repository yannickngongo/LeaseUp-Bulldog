"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  organizations: { name: string } | null;
}

function AcceptInviteContent() {
  const params  = useSearchParams();
  // router kept to satisfy import — navigation handled via Link hrefs
  useRouter();
  const token   = params.get("token") ?? "";

  const [inv, setInv]         = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!token) { setError("Invalid invitation link."); setLoading(false); return; }
    fetch(`/api/org/invite?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.invitation) setInv(d.invitation);
        else setError(d.error ?? "Invitation not found or expired.");
      })
      .catch(() => setError("Network error. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  const orgName   = inv?.organizations?.name ?? "your team";
  const signupUrl = `/signup?invite_token=${encodeURIComponent(token)}&invite_email=${encodeURIComponent(inv?.email ?? "")}`;
  const loginUrl  = `/login?invite_token=${encodeURIComponent(token)}`;

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#C8102E] flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">LeaseUp Bulldog</span>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-8 shadow-sm">
        {loading && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
            <p className="text-sm text-gray-500">Loading invitation…</p>
          </div>
        )}

        {!loading && error && !inv && (
          <div className="text-center py-4">
            <p className="text-4xl mb-4">⚠️</p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Invitation Invalid</h2>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <Link href="/" className="text-sm text-[#C8102E] hover:underline">Go to Dashboard →</Link>
          </div>
        )}

        {!loading && inv && (
          <>
            <div className="mb-6 text-center">
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#C8102E]/10">
                <svg className="h-7 w-7 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">You&rsquo;ve been invited</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Join <strong className="text-gray-900 dark:text-white">{orgName}</strong> as a{" "}
                <span className="rounded-full bg-[#C8102E]/10 px-2 py-0.5 text-xs font-semibold text-[#C8102E]">
                  {inv.role.replace("_", " ")}
                </span>
              </p>
            </div>

            <div className="mb-6 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Invitation for</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{inv.email}</p>
            </div>

            <div className="space-y-3">
              <Link
                href={signupUrl}
                className="flex w-full items-center justify-center rounded-xl bg-[#C8102E] py-3 text-sm font-semibold text-white hover:bg-[#A50D25] transition-colors"
              >
                Create Account →
              </Link>
              <Link
                href={loginUrl}
                className="flex w-full items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
              >
                I already have an account
              </Link>
            </div>

            <p className="mt-4 text-center text-xs text-gray-400">
              Expires {new Date(inv.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0F1117] px-4">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C8102E] border-t-transparent" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }>
        <AcceptInviteContent />
      </Suspense>
    </div>
  );
}
