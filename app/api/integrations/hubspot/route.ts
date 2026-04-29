// GET  /api/integrations/hubspot — return connection status for the operator
// POST /api/integrations/hubspot — connect (save access token) or disconnect
// Body for connect:    { action: "connect", accessToken: "pat-..." }
// Body for disconnect: { action: "disconnect" }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";
import { verifyHubSpotToken } from "@/lib/hubspot";

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data: op } = await db
    .from("operators")
    .select("hubspot_access_token, hubspot_portal_id, hubspot_connected_at")
    .eq("id", ctx.operatorId)
    .single();

  return NextResponse.json({
    connected:    !!op?.hubspot_access_token,
    portalId:     op?.hubspot_portal_id ?? null,
    connectedAt:  op?.hubspot_connected_at ?? null,
  });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; accessToken?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const db = getSupabaseAdmin();

  if (body.action === "disconnect") {
    await db.from("operators").update({
      hubspot_access_token: null,
      hubspot_portal_id:    null,
      hubspot_connected_at: null,
    }).eq("id", ctx.operatorId);
    return NextResponse.json({ ok: true, connected: false });
  }

  if (body.action === "connect") {
    const token = body.accessToken?.trim();
    if (!token) return NextResponse.json({ error: "accessToken is required" }, { status: 422 });

    // Verify the token is valid before saving
    const verification = await verifyHubSpotToken(token);
    if (!verification.ok) {
      return NextResponse.json(
        { error: "Invalid HubSpot access token. Make sure you are using a Private App token with crm.objects.contacts.write and crm.objects.deals.write scopes." },
        { status: 422 }
      );
    }

    await db.from("operators").update({
      hubspot_access_token: token,
      hubspot_portal_id:    verification.portalId ?? null,
      hubspot_connected_at: new Date().toISOString(),
    }).eq("id", ctx.operatorId);

    await db.from("activity_logs").insert({
      lead_id:     "00000000-0000-0000-0000-000000000000",
      property_id: "00000000-0000-0000-0000-000000000000",
      action:      "hubspot_connected",
      actor:       "agent",
      metadata:    { operator: ctx.email, portal_id: verification.portalId },
    });

    return NextResponse.json({ ok: true, connected: true, portalId: verification.portalId });
  }

  return NextResponse.json({ error: "action must be connect or disconnect" }, { status: 422 });
}
