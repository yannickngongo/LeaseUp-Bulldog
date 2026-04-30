// Authorization helpers.
//
// resolveCallerContext() (in lib/auth.ts) only verifies the caller is logged in.
// It does NOT check whether they own a given resource. These helpers add the
// ownership check on top.

import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

export interface AuthorizedContext {
  operatorId: string;
  email:      string;
}

/**
 * Authenticate the caller AND verify they own the given property.
 * Returns the operator context on success, or a NextResponse error on failure.
 */
export async function authorizeProperty(
  req:        NextRequest,
  propertyId: string
): Promise<{ ok: true; ctx: AuthorizedContext } | { ok: false; status: number; error: string }> {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return { ok: false, status: 401, error: "Unauthorized" };

  if (!propertyId || typeof propertyId !== "string") {
    return { ok: false, status: 400, error: "Invalid property ID" };
  }

  const db = getSupabaseAdmin();
  const { data: prop } = await db
    .from("properties")
    .select("operator_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (!prop) return { ok: false, status: 404, error: "Property not found" };
  if (prop.operator_id !== ctx.operatorId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, ctx };
}

/**
 * Authenticate the caller AND verify they own the lead via the lead's property.
 */
export async function authorizeLead(
  req:    NextRequest,
  leadId: string
): Promise<{ ok: true; ctx: AuthorizedContext; propertyId: string } | { ok: false; status: number; error: string }> {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return { ok: false, status: 401, error: "Unauthorized" };

  if (!leadId || typeof leadId !== "string") {
    return { ok: false, status: 400, error: "Invalid lead ID" };
  }

  const db = getSupabaseAdmin();
  const { data: lead } = await db
    .from("leads")
    .select("property_id, properties!inner(operator_id)")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, status: 404, error: "Lead not found" };
  // Supabase joined-row shape can come back as either a single object or an array
  // depending on the relationship. Handle both safely.
  const props      = lead.properties as unknown as { operator_id: string } | { operator_id: string }[] | null;
  const operatorId = Array.isArray(props) ? props[0]?.operator_id : props?.operator_id;
  if (operatorId !== ctx.operatorId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, ctx, propertyId: lead.property_id as string };
}
