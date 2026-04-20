"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  organizations: { name: string } | null;
}

export default function AcceptInvitePage() {
  const params   = useSearchParams();
  const router   = useRouter();
  const token    = params.get("token") ?? "";

  const [inv, setInv]       = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [accepting, setAccepting] = useState(false);
  const [done, setDone]     = useState(false);

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

  async function accept() {
    setAccepting(true);
    setError("");
    try {
      const res = await fetch("/api/org/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to accept invitation."); return; }
      setDone(true);
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  const orgName = inv?.organizations?.name ?? "your team";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0F1117] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
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

          {!loading && error && (
            <div className="text-center py-4">
              <div className="mb-4 text-4xl">⚠️</div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Invitation Invalid</h2>
              <p className="text-sm text-gray-500 mb-6">{error}</p>
              <Link href="/" className="text-sm text-[#C8102E] hover:underline">Go to Dashboard →</Link>
            </div>
          )}

          {!loading && !error && inv && !done && (
            <>
              <div className="mb-6 text-center">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#C8102E]/10">
                  <svg className="h-7 w-7 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">You&rsquo;ve been invited</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  You&rsquo;re invited to join <strong className="text-gray-900 dark:text-white">{orgName}</strong> as a{" "}
                  <span className="rounded-full bg-[#C8102E]/10 px-2 py-0.5 text-xs font-semibold text-[#C8102E]">{inv.role}</span>
                </p>
              </div>

              <div className="mb-6 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Invitation for</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{inv.email}</p>
              </div>

              {error && (
                <p className="mb-4 text-sm text-red-500">{error}</p>
              )}

              <button
                onClick={accept}
                disabled={accepting}
                className="w-full rounded-xl bg-[#C8102E] py-3 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
              >
                {accepting ? "Accepting…" : "Accept Invitation →"}
              </button>
            </>
          )}

          {done && (
            <div className="text-center py-4">
              <div className="mb-4 text-4xl">✅</div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Welcome aboard!</h2>
              <p className="text-sm text-gray-500">Redirecting you to the dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
