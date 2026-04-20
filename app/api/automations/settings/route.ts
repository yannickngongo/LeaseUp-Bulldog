// GET  /api/automations/settings?email=...
// PUT  /api/automations/settings        — save global (operator-level) automation settings
// POST /api/automations/settings/property — save per-property overrides

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const DEFAULT_SETTINGS = {
  instantEnabled:    true,
  responseTarget:    60,
  tone:              "friendly",
  followupEnabled:   true,
  noReplyMins:       180,
  tourNudgeEnabled:  true,
  noTourHrs:         48,
  appNudgeEnabled:   false,
  incompleteAppHrs:  72,
  noInventPrice:     true,
  noPromiseAvail:    true,
  alwaysQualify:     true,
  humanEscalate:     true,
  templates: {
    first_response: "Hi {{first_name}}! 👋 Thanks for your interest in {{property_name}}. I'm the AI leasing assistant — I'm here 24/7 to answer questions and help you schedule a tour.\n\nA few quick questions: When are you looking to move? And how many bedrooms do you need?",
    followup:       "Hey {{first_name}}, just checking in! We still have availability at {{property_name}} and I'd love to help you find the right fit.\n\nWould a tour this week work for you? I can set something up in just a few taps.",
    tour_reminder:  "Hi {{first_name}}, just a reminder that your tour at {{property_name}} is scheduled for tomorrow at {{tour_time}}.\n\n📍 {{property_address}}\n\nReply CONFIRM to confirm or RESCHEDULE if you need a different time.",
    app_push:       "{{first_name}}, it was great meeting you! If you're ready to move forward, here's your application link:\n\n{{application_link}}\n\nIt only takes about 10 minutes. Let me know if you have any questions!",
  },
};

const DEFAULT_PROPERTY_SETTINGS = {
  active_special:       "",
  application_link:     "",
  tour_window:          "9am-6pm",
  confirm_availability: true,
  office_hours_only:    false,
};

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: operator } = await db
    .from("operators")
    .select("id, settings")
    .eq("email", email)
    .single();

  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const { data: properties } = await db
    .from("properties")
    .select("id, name, active_special, website_url, settings")
    .eq("operator_id", operator.id);

  const operatorSettings = { ...DEFAULT_SETTINGS, ...(operator.settings ?? {}) };

  const propertySettings: Record<string, typeof DEFAULT_PROPERTY_SETTINGS> = {};
  for (const p of properties ?? []) {
    propertySettings[p.id] = {
      ...DEFAULT_PROPERTY_SETTINGS,
      active_special: p.active_special ?? "",
      ...(p.settings ?? {}),
    };
  }

  return NextResponse.json({
    settings: operatorSettings,
    propertySettings,
    properties: (properties ?? []).map(p => ({ id: p.id, name: p.name })),
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { email, settings } = body;
  if (!email || !settings) return NextResponse.json({ error: "email and settings required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: operator } = await db.from("operators").select("id").eq("email", email).single();
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const { error } = await db
    .from("operators")
    .update({ settings })
    .eq("id", operator.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { propertyId, settings } = body;
  if (!propertyId || !settings) return NextResponse.json({ error: "propertyId and settings required" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Build update: merge settings JSONB + update active_special if present
  const updates: Record<string, unknown> = { settings };
  if (typeof settings.active_special === "string") {
    updates.active_special = settings.active_special || null;
  }

  const { error } = await db.from("properties").update(updates).eq("id", propertyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
