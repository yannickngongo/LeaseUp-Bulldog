// lib/rate-limit.ts
// In-memory rate limiter for API abuse prevention.
// Per Vercel serverless model: each function instance tracks its own window.
// This stops burst attacks within a single instance; for global coordination
// replace the Map with Upstash Redis at `@upstash/ratelimit`.

interface State { count: number; resetAt: number; }

const store = new Map<string, State>();

// Prune entries older than 10 min to prevent unbounded memory growth.
let lastPrune = Date.now();
function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < 600_000) return;
  lastPrune = now;
  for (const [key, state] of store.entries()) {
    if (now > state.resetAt) store.delete(key);
  }
}

/**
 * Returns true if the request is within the rate limit, false if it should be blocked.
 * @param key      Unique identifier (IP address, user ID, etc.)
 * @param limit    Max requests allowed in the window
 * @param windowMs Rolling window in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  maybePrune();
  const now   = Date.now();
  const state = store.get(key);
  if (!state || now > state.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (state.count >= limit) return false;
  state.count++;
  return true;
}

/** Extract the real client IP from Vercel/Cloudflare forwarding headers. */
export function getClientIp(req: Request): string {
  const headers = req.headers as Headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}
