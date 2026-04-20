// GET  /api/intelligence/action-queue — get operator action queue
// POST /api/intelligence/action-queue — add action
// PATCH /api/intelligence/action-queue — approve or dismiss

import { NextRequest, NextResponse } from "next/server";
import { getOperatorActionQueue, addToActionQueue, dismissAction, approveAction } from "@/lib/action-queue";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const result = await getOperatorActionQueue({
    operatorId: params.get("operator_id") ?? undefined,
    propertyId: params.get("property_id") ?? undefined,
    urgency:    params.get("urgency")     ?? undefined,
    limit:      params.get("limit") ? parseInt(params.get("limit")!) : undefined,
  });
  return NextResponse.json({ ok: true, actions: result });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = await addToActionQueue(body);
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(req: NextRequest) {
  const { action_id, operation } = await req.json();
  if (!action_id || !operation) {
    return NextResponse.json({ error: "action_id and operation required" }, { status: 400 });
  }

  if (operation === "dismiss") await dismissAction(action_id);
  else if (operation === "approve") await approveAction(action_id);
  else return NextResponse.json({ error: "operation must be dismiss or approve" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
