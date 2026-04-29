// GET  /api/integrations/meta — return Meta Ads connection status
// POST /api/integrations/meta — connect or disconnect Meta Ads account
//
// Body for connect:    { action: "connect", accessToken, adAccountId, pageId }
// Body for disconnect: { action: "disconnect" }
//
// The accessToken should be a long-lived Page access token with:
//   ads_management, leads_retrieval, pages_show_list permissions.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";
import { verifyMetaToken } from "@/lib/meta-ads";

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data: op } = await db
    .from("operators")
    .select("meta_access_token, meta_ad_account_id, meta_page_id, meta_connected_at")
    .eq("id", ctx.operatorId)
    .single();

  return NextResponse.json({
    connected:    !!op?.meta_access_token,
    adAccountId:  op?.meta_ad_account_id ?? null,
    pageId:       op?.meta_page_id       ?? null,
    connectedAt:  op?.meta_connected_at  ?? null,
  });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; accessToken?: string; adAccountId?: string; pageId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const db = getSupabaseAdmin();

  if (body.action === "disconnect") {
    await db.from("operators").update({
      meta_access_token:  null,
      meta_ad_account_id: null,
      meta_page_id:       null,
      meta_connected_at:  null,
    }).eq("id", ctx.operatorId);
    return NextResponse.json({ ok: true, connected: false });
  }

  if (body.action === "connect") {
    const accessToken  = body.accessToken?.trim();
    const adAccountId  = body.adAccountId?.trim();
    const pageId       = body.pageId?.trim();

    if (!accessToken)  return NextResponse.json({ error: "accessToken is required" },  { status: 422 });
    if (!adAccountId)  return NextResponse.json({ error: "adAccountId is required" },  { status: 422 });
    if (!pageId)       return NextResponse.json({ error: "pageId is required" },        { status: 422 });

    // Normalise ad account ID — must start with "act_"
    const normAdAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

    const verification = await verifyMetaToken(accessToken, normAdAccountId, pageId);
    if (!verification.ok) {
      return NextResponse.json(
        { error: `Meta token verification failed: ${verification.error}` },
        { status: 422 }
      );
    }

    await db.from("operators").update({
      meta_access_token:  accessToken,
      meta_ad_account_id: normAdAccountId,
      meta_page_id:       pageId,
      meta_connected_at:  new Date().toISOString(),
    }).eq("id", ctx.operatorId);

    await db.from("activity_logs").insert({
      lead_id:     "00000000-0000-0000-0000-000000000000",
      property_id: "00000000-0000-0000-0000-000000000000",
      action:      "meta_ads_connected",
      actor:       "agent",
      metadata:    { operator: ctx.email, ad_account_id: normAdAccountId, page_id: pageId },
    });

    return NextResponse.json({ ok: true, connected: true, adAccountId: normAdAccountId, pageId });
  }

  return NextResponse.json({ error: "action must be connect or disconnect" }, { status: 422 });
}
