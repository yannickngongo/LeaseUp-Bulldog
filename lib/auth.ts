// lib/auth.ts
// Server-side permission helpers for the sub-account system.
//
// USAGE in API routes:
//   const ctx = await resolveCallerContext(req);
//   if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   requireRole(ctx, "manager");                   // throws 403 if insufficient
//   requirePropertyAccess(ctx, propertyId);        // throws 403 if no access
//
// ROLES (ascending privilege):
//   viewer → leasing_agent → manager → admin → owner
//
// PERMISSIONS:
//   Defined as a union — each role gets a set. Higher roles include lower roles.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// ─── Role hierarchy ───────────────────────────────────────────────────────────

export type Role = "viewer" | "leasing_agent" | "manager" | "admin" | "owner";

const ROLE_RANK: Record<Role, number> = {
  viewer: 0, leasing_agent: 1, manager: 2, admin: 3, owner: 4,
};

// ─── Permission matrix ────────────────────────────────────────────────────────

export type Permission =
  | "view_dashboard"
  | "view_analytics"
  | "reply_to_leads"
  | "manage_campaigns"
  | "edit_property_settings"
  | "manage_users"
  | "manage_billing"
  | "approve_ai_actions"
  | "takeover_conversations";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: [
    "view_dashboard",
    "view_analytics",
  ],
  leasing_agent: [
    "view_dashboard",
    "view_analytics",
    "reply_to_leads",
    "takeover_conversations",
  ],
  manager: [
    "view_dashboard",
    "view_analytics",
    "reply_to_leads",
    "takeover_conversations",
    "manage_campaigns",
    "approve_ai_actions",
  ],
  admin: [
    "view_dashboard",
    "view_analytics",
    "reply_to_leads",
    "takeover_conversations",
    "manage_campaigns",
    "approve_ai_actions",
    "edit_property_settings",
    "manage_users",
  ],
  owner: [
    "view_dashboard",
    "view_analytics",
    "reply_to_leads",
    "takeover_conversations",
    "manage_campaigns",
    "approve_ai_actions",
    "edit_property_settings",
    "manage_users",
    "manage_billing",
  ],
};

// ─── Caller context ───────────────────────────────────────────────────────────

export interface CallerContext {
  userId:         string;
  email:          string;
  operatorId:     string;
  organizationId: string | null;
  role:           Role;
  isOwner:        boolean;
  // null means "can access ALL properties" (owner / no org yet)
  allowedPropertyIds: string[] | null;
}

// ─── Resolve context from request ─────────────────────────────────────────────
// Requires Authorization: Bearer <supabase-jwt> on every request.
// Returns null (→ 401) if the token is missing, invalid, or not tied to a known operator.

// ─── Security event logging ───────────────────────────────────────────────────
// Non-fatal — if the log insert fails, auth still proceeds/rejects normally.

async function logAuthEvent(
  db: ReturnType<typeof getSupabaseAdmin>,
  event: "auth_missing_token" | "auth_invalid_token" | "auth_unknown_operator",
  req: NextRequest,
  extra?: Record<string, unknown>
) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  await db.from("activity_logs").insert({
    lead_id:     "00000000-0000-0000-0000-000000000000",
    property_id: "00000000-0000-0000-0000-000000000000",
    action:      event,
    actor:       "system",
    metadata:    { ip, path: req.nextUrl.pathname, ...extra },
  }).then(({ error }) => {
    if (error) console.error(`[auth] failed to log ${event}:`, error.message);
  });
}

export async function resolveCallerContext(
  req: NextRequest
): Promise<CallerContext | null> {
  const db = getSupabaseAdmin();

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    logAuthEvent(db, "auth_missing_token", req);
    return null;
  }

  const token = auth.slice(7);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email) {
    logAuthEvent(db, "auth_invalid_token", req, { supabaseError: error?.message });
    return null;
  }

  const email = data.user.email;

  // Find operator by email
  const { data: operator } = await db
    .from("operators")
    .select("id")
    .eq("email", email)
    .single();

  if (!operator) {
    logAuthEvent(db, "auth_unknown_operator", req, { email });
    return null;
  }

  // Check if this operator OWNS an organization
  const { data: ownedOrg } = await db
    .from("organizations")
    .select("id")
    .eq("operator_id", operator.id)
    .single();

  // Check if this user is a MEMBER of any organization (invited team member)
  const { data: memberRecord } = await db
    .from("organization_members")
    .select("organization_id, role, user_id")
    .eq("email", email)
    .eq("status", "active")
    .single();

  const org = ownedOrg ?? (memberRecord ? { id: memberRecord.organization_id } : null);

  if (!org) {
    // No org at all — single-operator mode
    return {
      userId:             email,
      email,
      operatorId:         operator.id,
      organizationId:     null,
      role:               "owner",
      isOwner:            true,
      allowedPropertyIds: null,
    };
  }

  // For org owners, look up their member record (may not exist yet)
  const { data: member } = ownedOrg
    ? await db
        .from("organization_members")
        .select("role, user_id")
        .eq("organization_id", org.id)
        .eq("email", email)
        .eq("status", "active")
        .single()
    : { data: memberRecord };

  // If org belongs to this operator but they're not in members yet, treat as owner
  const role = (member?.role ?? (ownedOrg ? "owner" : "viewer")) as Role;
  const isOwner = role === "owner" || role === "admin";

  // If owner/admin — all properties accessible
  if (isOwner) {
    return {
      userId: member?.user_id ?? email,
      email,
      operatorId:         operator.id,
      organizationId:     org.id,
      role,
      isOwner:            true,
      allowedPropertyIds: null,
    };
  }

  // Restricted user: load their property access list
  const { data: accessRows } = await db
    .from("user_property_access")
    .select("property_id")
    .eq("user_id", member?.user_id ?? email)
    .eq("organization_id", org.id);

  const allowedPropertyIds = (accessRows ?? []).map(r => r.property_id);

  return {
    userId:             member?.user_id ?? email,
    email,
    operatorId:         operator.id,
    organizationId:     org.id,
    role,
    isOwner:            false,
    allowedPropertyIds,
  };
}

// ─── Permission guards ─────────────────────────────────────────────────────────

export function hasPermission(ctx: CallerContext, permission: Permission): boolean {
  return ROLE_PERMISSIONS[ctx.role]?.includes(permission) ?? false;
}

export function hasRole(ctx: CallerContext, minRole: Role): boolean {
  return ROLE_RANK[ctx.role] >= ROLE_RANK[minRole];
}

export function canAccessProperty(ctx: CallerContext, propertyId: string): boolean {
  if (ctx.allowedPropertyIds === null) return true; // owner / no restriction
  return ctx.allowedPropertyIds.includes(propertyId);
}

// Guards that return NextResponse on failure (for use in API routes)

export function requirePermission(
  ctx: CallerContext,
  permission: Permission
): NextResponse | null {
  if (!hasPermission(ctx, permission)) {
    return NextResponse.json(
      { error: `Insufficient permissions. Required: ${permission}` },
      { status: 403 }
    );
  }
  return null;
}

export function requirePropertyAccess(
  ctx: CallerContext,
  propertyId: string
): NextResponse | null {
  if (!canAccessProperty(ctx, propertyId)) {
    return NextResponse.json(
      { error: "You do not have access to this property" },
      { status: 403 }
    );
  }
  return null;
}

// Filter a list of property IDs down to only those the caller can access
export function filterAllowedProperties(
  ctx: CallerContext,
  propertyIds: string[]
): string[] {
  if (ctx.allowedPropertyIds === null) return propertyIds;
  return propertyIds.filter(id => ctx.allowedPropertyIds!.includes(id));
}
