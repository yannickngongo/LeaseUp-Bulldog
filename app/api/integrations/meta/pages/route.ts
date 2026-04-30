// GET /api/integrations/meta/pages
// Returns the operator's available Pages and Ad Accounts so the picker UI
// can show them after the OAuth callback.
//
// Reads the long-lived user token from operators.meta_oauth_user_token,
// which was stored by /oauth/callback.

import { NextRequest, NextResponse } from "next/server";
import { resolveCallerContext } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const META_API_VERSION = "v20.0";
const BASE             = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaPage {
  id:           string;
  name:         string;
  access_token: string;
  category:     string;
  followers?:   number;
}

interface MetaAdAccount {
  id:               string;  // "act_123…"
  name:             string;
  account_status:   number;  // 1 = active
  currency:         string;
  funding_source_details?: { display_string?: string };
}

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data: op } = await db
    .from("operators")
    .select("meta_oauth_user_token")
    .eq("id", ctx.operatorId)
    .single();

  const userToken = op?.meta_oauth_user_token as string | undefined;
  if (!userToken) {
    return NextResponse.json({
      error: "No OAuth token found — please reconnect via the Connect with Facebook button",
    }, { status: 400 });
  }

  try {
    // Fetch pages — returns each page's specific access token (this is the one we store)
    const pagesUrl = new URL(`${BASE}/me/accounts`);
    pagesUrl.searchParams.set("fields",       "id,name,access_token,category,followers_count");
    pagesUrl.searchParams.set("access_token", userToken);
    pagesUrl.searchParams.set("limit",        "100");

    const pagesRes = await fetch(pagesUrl.toString());
    const pagesJson = await pagesRes.json() as { data?: (MetaPage & { followers_count?: number })[]; error?: { message: string } };
    if (!pagesRes.ok || pagesJson.error) {
      return NextResponse.json({ error: pagesJson.error?.message ?? "Failed to fetch pages" }, { status: 502 });
    }

    // Fetch ad accounts the user has access to
    const adAccountsUrl = new URL(`${BASE}/me/adaccounts`);
    adAccountsUrl.searchParams.set("fields",       "id,name,account_status,currency,funding_source_details");
    adAccountsUrl.searchParams.set("access_token", userToken);
    adAccountsUrl.searchParams.set("limit",        "100");

    const adRes  = await fetch(adAccountsUrl.toString());
    const adJson = await adRes.json() as { data?: MetaAdAccount[]; error?: { message: string } };
    if (!adRes.ok || adJson.error) {
      return NextResponse.json({ error: adJson.error?.message ?? "Failed to fetch ad accounts" }, { status: 502 });
    }

    const pages = (pagesJson.data ?? []).map(p => ({
      id:        p.id,
      name:      p.name,
      category:  p.category,
      followers: p.followers_count ?? 0,
      // Don't return access_token to client — it's stored server-side via /finalize lookup
    }));

    const adAccounts = (adJson.data ?? []).map(a => ({
      id:                a.id,
      name:              a.name,
      status:            a.account_status === 1 ? "active" : "inactive",
      currency:          a.currency,
      fundingDisplay:    a.funding_source_details?.display_string ?? null,
    }));

    return NextResponse.json({ pages, adAccounts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
