// POST /api/integrations/meta/finalize
//
// After the user picks a Page and Ad Account in the picker UI, this route:
//   1. Re-fetches /me/accounts using the operator's OAuth user token
//   2. Pulls the page-specific access token for the chosen Page
//   3. Verifies the access token works against both the Page and the Ad Account
//   4. Stores the page token + ids on the operators row
//   5. Subscribes the Page to leadgen webhooks (best-effort)
//   6. Clears the temp meta_oauth_user_token
//
// Body: { pageId: string, adAccountId: string }

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCallerContext } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyMetaToken } from "@/lib/meta-ads";

const META_API_VERSION = "v20.0";
const BASE             = `https://graph.facebook.com/${META_API_VERSION}`;

const Schema = z.object({
  pageId:      z.string().min(1),
  adAccountId: z.string().min(1),
});

async function subscribePageToLeadgen(
  pageId:    string,
  pageToken: string
): Promise<boolean> {
  // Best effort — if this fails the connection still works, leads just won't auto-flow
  try {
    const url = new URL(`${BASE}/${pageId}/subscribed_apps`);
    url.searchParams.set("subscribed_fields", "leadgen");
    url.searchParams.set("access_token",      pageToken);
    const res = await fetch(url.toString(), { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }
  const { pageId, adAccountId } = parsed.data;
  const normAdAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  const db = getSupabaseAdmin();
  const { data: op } = await db
    .from("operators")
    .select("meta_oauth_user_token")
    .eq("id", ctx.operatorId)
    .single();

  const userToken = op?.meta_oauth_user_token as string | undefined;
  if (!userToken) {
    return NextResponse.json({
      error: "OAuth session expired. Please reconnect via the Connect with Facebook button.",
    }, { status: 400 });
  }

  try {
    // Re-fetch /me/accounts to get the page-specific access token for the chosen page
    const pagesUrl = new URL(`${BASE}/me/accounts`);
    pagesUrl.searchParams.set("fields",       "id,name,access_token");
    pagesUrl.searchParams.set("access_token", userToken);
    pagesUrl.searchParams.set("limit",        "100");

    const pagesRes  = await fetch(pagesUrl.toString());
    const pagesJson = await pagesRes.json() as {
      data?: { id: string; name: string; access_token: string }[];
      error?: { message: string };
    };
    if (!pagesRes.ok || pagesJson.error) {
      return NextResponse.json({ error: pagesJson.error?.message ?? "Failed to fetch pages" }, { status: 502 });
    }

    const matchingPage = (pagesJson.data ?? []).find(p => p.id === pageId);
    if (!matchingPage) {
      return NextResponse.json({ error: "Selected page not accessible with current token" }, { status: 404 });
    }
    const pageToken = matchingPage.access_token;

    // Verify the page token has access to both the page and the chosen ad account.
    // Page tokens by default can manage their own page; ad account access works
    // when the user is a business admin/advertiser on that ad account.
    const verification = await verifyMetaToken(pageToken, normAdAccountId, pageId);
    if (!verification.ok) {
      return NextResponse.json({
        error: `Token validation failed: ${verification.error}. Make sure the Facebook user who connected has admin access to the chosen Ad Account.`,
      }, { status: 422 });
    }

    // Subscribe page to leadgen webhooks (so leads auto-flow into LUB)
    const subscribed = await subscribePageToLeadgen(pageId, pageToken);

    // Store final credentials, clear temp OAuth token
    await db.from("operators").update({
      meta_access_token:     pageToken,
      meta_ad_account_id:    normAdAccountId,
      meta_page_id:          pageId,
      meta_connected_at:     new Date().toISOString(),
      meta_oauth_user_token: null,
    }).eq("id", ctx.operatorId);

    await db.from("activity_logs").insert({
      lead_id:     "00000000-0000-0000-0000-000000000000",
      property_id: "00000000-0000-0000-0000-000000000000",
      action:      "meta_ads_connected",
      actor:       "agent",
      metadata:    {
        operator:                  ctx.email,
        ad_account_id:             normAdAccountId,
        page_id:                   pageId,
        page_name:                 matchingPage.name,
        leadgen_subscribed:        subscribed,
        connection_method:         "oauth",
      },
    });

    return NextResponse.json({
      ok:                  true,
      adAccountId:         normAdAccountId,
      pageId,
      pageName:            matchingPage.name,
      leadgenSubscribed:   subscribed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
