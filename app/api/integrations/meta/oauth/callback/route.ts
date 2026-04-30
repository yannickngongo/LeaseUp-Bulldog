// GET /api/integrations/meta/oauth/callback?code=...&state=...
//
// Facebook redirects here after the user grants (or denies) permissions.
// Steps:
//   1. Read meta_oauth_state + meta_oauth_operator_id cookies set by /start
//   2. Verify the state cookie matches the state query param (CSRF)
//   3. Exchange code → short-lived user token (server-to-server)
//   4. Exchange short-lived → long-lived user token (60-day)
//   5. Store the long-lived USER token on operators.meta_oauth_user_token
//   6. Redirect to /integrations?meta_picker=1 so the user can pick which Page
//      and Ad Account they want to connect.
//
// The PAGE-specific access token (which is what we actually use for ad ops)
// is fetched in /api/integrations/meta/pages and stored by /finalize.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const META_API_VERSION = "v20.0";

function redirectWithError(baseUrl: string, error: string): NextResponse {
  const url = new URL(`${baseUrl}/integrations`);
  url.searchParams.set("meta_error", error);
  return NextResponse.redirect(url.toString());
}

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const { searchParams } = new URL(req.url);
  const code            = searchParams.get("code");
  const state           = searchParams.get("state");
  const facebookError   = searchParams.get("error");
  const errorReason     = searchParams.get("error_reason");

  // User clicked "Cancel" or denied permissions in the FB dialog
  if (facebookError) {
    return redirectWithError(baseUrl, errorReason ?? facebookError);
  }
  if (!code || !state) {
    return redirectWithError(baseUrl, "missing_code_or_state");
  }

  // Read cookies
  const cookieState  = req.cookies.get("meta_oauth_state")?.value;
  const operatorId   = req.cookies.get("meta_oauth_operator_id")?.value;
  if (!cookieState || !operatorId) {
    return redirectWithError(baseUrl, "session_expired");
  }
  if (cookieState !== state) {
    return redirectWithError(baseUrl, "state_mismatch");
  }

  const appId     = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return redirectWithError(baseUrl, "oauth_not_configured");
  }

  const redirectUri = `${baseUrl}/api/integrations/meta/oauth/callback`;

  try {
    // Step 1: code → short-lived user token
    const tokenUrl1 = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
    tokenUrl1.searchParams.set("client_id",     appId);
    tokenUrl1.searchParams.set("client_secret", appSecret);
    tokenUrl1.searchParams.set("redirect_uri",  redirectUri);
    tokenUrl1.searchParams.set("code",          code);

    const r1 = await fetch(tokenUrl1.toString());
    const j1 = await r1.json() as { access_token?: string; error?: { message: string } };
    if (!r1.ok || !j1.access_token) {
      return redirectWithError(baseUrl, j1.error?.message ?? "token_exchange_failed");
    }
    const shortLivedToken = j1.access_token;

    // Step 2: short-lived → long-lived user token (60-day)
    const tokenUrl2 = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
    tokenUrl2.searchParams.set("grant_type",        "fb_exchange_token");
    tokenUrl2.searchParams.set("client_id",         appId);
    tokenUrl2.searchParams.set("client_secret",     appSecret);
    tokenUrl2.searchParams.set("fb_exchange_token", shortLivedToken);

    const r2 = await fetch(tokenUrl2.toString());
    const j2 = await r2.json() as { access_token?: string; error?: { message: string } };
    if (!r2.ok || !j2.access_token) {
      return redirectWithError(baseUrl, j2.error?.message ?? "long_token_failed");
    }
    const longLivedUserToken = j2.access_token;

    // Step 3: store the long-lived USER token (will be used by /pages and /finalize)
    const db = getSupabaseAdmin();
    await db.from("operators")
      .update({ meta_oauth_user_token: longLivedUserToken })
      .eq("id", operatorId);

    // Step 4: redirect to integrations page with picker flag, clear state cookies
    const successUrl = new URL(`${baseUrl}/integrations`);
    successUrl.searchParams.set("tab",          "meta_ads");
    successUrl.searchParams.set("meta_picker",  "1");

    const res = NextResponse.redirect(successUrl.toString());
    res.cookies.delete("meta_oauth_state");
    res.cookies.delete("meta_oauth_operator_id");
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    return redirectWithError(baseUrl, msg);
  }
}
