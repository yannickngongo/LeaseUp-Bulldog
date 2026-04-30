"use client";

import { useEffect } from "react";

// Captures utm_* params from the URL on first visit and stashes them in
// localStorage. The /setup endpoint reads these on signup and persists them
// to operators.signup_utm_* so we can track which campaign brought each customer.
//
// Mount this once in the root layout. It's idempotent — on every render it
// just stores whatever's in the URL (or no-ops if no UTMs).

const STORAGE_KEY = "lub_signup_attribution";

interface Stored {
  utm_source?:   string;
  utm_medium?:   string;
  utm_campaign?: string;
  referrer?:     string;
  captured_at:   string;
}

export function UtmCapture() {
  useEffect(() => {
    try {
      const url    = new URL(window.location.href);
      const source = url.searchParams.get("utm_source")   ?? undefined;
      const medium = url.searchParams.get("utm_medium")   ?? undefined;
      const campaign = url.searchParams.get("utm_campaign") ?? undefined;

      // No UTM params → don't overwrite an earlier capture
      if (!source && !medium && !campaign) return;

      const data: Stored = {
        utm_source:   source,
        utm_medium:   medium,
        utm_campaign: campaign,
        referrer:     document.referrer || undefined,
        captured_at:  new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore — quota exceeded, private browsing, etc. */ }
  }, []);

  return null;
}

/**
 * Read the stored UTM attribution. Call this from the signup/setup form
 * to include the data in the request body.
 */
export function readStoredAttribution(): {
  utm_source?:   string;
  utm_medium?:   string;
  utm_campaign?: string;
  referrer?:     string;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}
