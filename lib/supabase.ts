// Supabase client helpers for server-side use.
//
// Three access patterns (only first two are active in v1):
//   getSupabaseAdmin()  — service-role, bypasses RLS. Use in API routes + Server Components.
//   getSupabaseClient() — anon key, respects RLS. Reserved for future client-side auth.
//   getSupabaseServer() — user-scoped session client. Stub for when auth is added.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key} — check .env.local`);
  return value;
}

// Cached singletons — avoids creating a new client on every request
let _admin: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

// Server-only. Bypasses Row Level Security.
// Use this in all API routes and Server Components for v1.
// Never import into client components or expose to the browser.
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  _admin = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
  return _admin;
}

// Browser-safe. Respects RLS.
// Not used in v1 — placeholder for when client-side auth is added.
export function getSupabaseClient(): SupabaseClient {
  if (_anon) return _anon;
  _anon = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
  return _anon;
}

// TODO (auth): when Supabase Auth is added, add getSupabaseServer() here.
// It will accept a cookies() instance and return a user-scoped client
// that enforces RLS based on the logged-in operator session.
