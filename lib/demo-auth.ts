// lib/demo-auth.ts
// Client-side helpers for auth state and authenticated API calls.

import { createBrowserClient } from "@supabase/ssr";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

const STORAGE_KEY = "lub_operator_email";

export function saveOperatorEmail(email: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, email);
  }
}

export function clearOperatorEmail() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

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

/** Returns the current Supabase access token, or null if not signed in. */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Authenticated fetch wrapper.
 * Automatically injects `Authorization: Bearer <token>` when signed in.
 * Falls back to email-in-body pattern for backwards compatibility.
 */
export async function authFetch(
  url: string,
  init: RequestInit & { body?: BodyInit | Record<string, unknown> | null } = {}
): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const body =
    init.body && typeof init.body === "object" && !(init.body instanceof FormData)
      ? JSON.stringify(init.body)
      : (init.body as BodyInit | null | undefined);

  return fetch(url, { ...init, headers, body });
}
