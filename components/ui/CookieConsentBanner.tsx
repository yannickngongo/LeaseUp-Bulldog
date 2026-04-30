"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "lub_cookie_consent";

type ConsentStatus = "accepted" | "rejected";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch { /* ignore */ }
  }, []);

  function record(status: ConsentStatus) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, at: new Date().toISOString() }));
    } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] sm:left-auto sm:bottom-6 sm:right-6 sm:max-w-sm">
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1F2E] p-4 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-1.5">
          Cookies &amp; analytics
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
          We use essential cookies to keep you logged in and a small amount of analytics
          to understand how operators use the product. Read our{" "}
          <Link href="/privacy" className="text-[#C8102E] hover:underline">privacy policy</Link>.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => record("accepted")}
            className="flex-1 rounded-lg bg-[#C8102E] px-3 py-2 text-xs font-bold text-white hover:bg-[#A50D25] transition-colors"
          >
            Accept all
          </button>
          <button
            onClick={() => record("rejected")}
            className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}
