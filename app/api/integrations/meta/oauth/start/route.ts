// POST /api/integrations/meta/oauth/start
//
// Returns a Facebook OAuth dialog URL for the client to redirect the user to.
// Sets two HttpOnly cookies (state + operator_id) used by the callback to verify
// the request and identify the user when Facebook redirects back.
//
// Required env vars:
//   META_APP_ID                — your Facebook App's App ID (also fine as NEXT_PUBLIC_)
//   NEXT_PUBLIC_APP_URL        — used to build the redirect URI

import { NextRequest, NextResponse } from "next/server";
import { resolveCallerContext } from "@/lib/auth";
import crypto from "crypto";

const META_API_VERSION = "v20.0";

const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",  // required to subscribe webhooks
  "pages_manage_ads",
  "ads_management",
  "ads_read",
  "leads_retrieval",
  "business_management",
].join(",");

export async function POST(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID;
  if (!appId) {
    return NextResponse.json({
      error: "Meta OAuth not configured. Set META_APP_ID in your environment, or use the manual setup as a fallback.",
    }, { status: 500 });
  }

  const baseUrl     = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/integrations/meta/oauth/callback`;
  const state       = crypto.randomBytes(32).toString("hex");

  const url = new URL(`https://www.facebook.com/${META_API_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id",     appId);
  url.searchParams.set("redirect_uri",  redirectUri);
  url.searchParams.set("scope",         SCOPES);
  url.searchParams.set("state",         state);
  url.searchParams.set("response_type", "code");

  const res = NextResponse.json({ redirectUrl: url.toString() });
  // CSRF protection: callback verifies these cookies match
  const cookieOpts = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path:     "/",
    maxAge:   600, // 10 minutes — OAuth dance must complete in this window
  };
  res.cookies.set("meta_oauth_state",       state,           cookieOpts);
  res.cookies.set("meta_oauth_operator_id", ctx.operatorId,  cookieOpts);
  return res;
}

// Allow GET fallback (some Facebook redirect flows or manual testing)
export const GET = POST;
