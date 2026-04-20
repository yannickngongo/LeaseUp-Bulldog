// lib/demo-auth.ts
// Client-side helper for resolving the operator email.
// For demo/testing: no login required — email is stored in localStorage after setup.
// For production: Supabase auth session takes precedence.

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

const STORAGE_KEY = "lub_operator_email";

/** Save email to localStorage after setup (demo mode). */
export function saveOperatorEmail(email: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, email);
  }
}

/** Clear saved email (on logout). */
export function clearOperatorEmail() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Get the operator email.
 * 1. Tries Supabase auth session first.
 * 2. Falls back to localStorage (demo / no-login mode).
 */
export async function getOperatorEmail(): Promise<string | null> {
  try {
    const { data } = await getSupabase().auth.getUser();
    if (data.user?.email) return data.user.email;
  } catch {}

  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEY);
  }
  return null;
}
