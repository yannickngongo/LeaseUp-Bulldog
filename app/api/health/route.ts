// GET /api/health
// Liveness + dependency check. Returns 200 if all critical dependencies
// are reachable, 503 if any are down. Used by uptime monitors (Better Stack,
// Vercel Cron heartbeat, PagerDuty checks).

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

interface CheckResult {
  ok:        boolean;
  ms?:       number;
  error?:    string;
}

async function timed<T>(fn: () => Promise<T>): Promise<CheckResult> {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkSupabase(): Promise<CheckResult> {
  return timed(async () => {
    const db = getSupabaseAdmin();
    // Cheapest possible query — just confirms the connection works
    const { error } = await db.from("operators").select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
  });
}

async function checkStripe(): Promise<CheckResult> {
  return timed(async () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    const r = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) throw new Error(`Stripe API ${r.status}`);
  });
}

async function checkAnthropic(): Promise<CheckResult> {
  return timed(async () => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
    // No "ping" endpoint — just verify the API key auths against the models endpoint
    const r = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    if (!r.ok) throw new Error(`Anthropic API ${r.status}`);
  });
}

async function checkTwilio(): Promise<CheckResult> {
  return timed(async () => {
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error("Twilio credentials not configured");
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!r.ok) throw new Error(`Twilio API ${r.status}`);
  });
}

export async function GET() {
  const [supabase, stripe, anthropic, twilio] = await Promise.all([
    checkSupabase(),
    checkStripe(),
    checkAnthropic(),
    checkTwilio(),
  ]);

  const allOk = supabase.ok && stripe.ok && anthropic.ok && twilio.ok;

  return NextResponse.json(
    {
      ok:         allOk,
      timestamp:  new Date().toISOString(),
      uptime:     typeof process.uptime === "function" ? Math.round(process.uptime()) : undefined,
      checks: {
        supabase,
        stripe,
        anthropic,
        twilio,
      },
    },
    { status: allOk ? 200 : 503 }
  );
}
