"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry already auto-captures via @sentry/nextjs, but log for local dev
    console.error("Page error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#08080F] text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-3">500</p>
        <h1 className="text-3xl font-black mb-3">Something broke on our end</h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-2">
          We&apos;re sorry — an unexpected error occurred. Our team has been notified automatically.
        </p>
        {error.digest && (
          <p className="text-[11px] text-gray-600 font-mono mb-6">Error ID: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={reset}
            className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
            style={{ boxShadow: "0 4px 16px rgba(200,16,46,0.25)" }}
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[#1E1E2E] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
