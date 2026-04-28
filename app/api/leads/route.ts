// POST /api/leads — create a lead, generate an AI welcome SMS, send it, and log everything
// GET  /api/leads — list leads (filterable by propertyId and status)
//
// Business rules:
//   - propertyId is required and must exist (no orphan leads)
//   - status starts as "new", updated to "contacted" after SMS is sent
//   - every lead creation and every outbound SMS is written to activity_logs
//   - every outbound message is stored in conversations

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLeadReply } from "@/lib/anthropic";
import { sendSms, normalizePhone } from "@/lib/twilio";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// ─── Input schema (camelCase from caller) ─────────────────────────────────────

const CreateLeadSchema = z.object({
  propertyId: z.string().uuid("propertyId must be a valid UUID"),
  firstName: z.string().min(1, "firstName is required"),
  lastName: z.string().default(""),
  phone: z
    .string()
    .min(10, "phone must be at least 10 digits")
    .regex(/^\+?[\d\s\-().]+$/, "phone contains invalid characters")
    .transform((val) => normalizePhone(val)),
  email: z.string().email("invalid email address").optional(),
  preferredContactMethod: z.enum(["sms", "email", "call"]).default("sms"),
  source: z.string().default("manual"),
  desiredMoveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "desiredMoveDate must be in YYYY-MM-DD format")
    .optional(),
  unitType: z.enum(["studio", "1br", "2br", "3br", "4br", "5br"]).optional(),
  budget: z
    .object({
      min: z.number().int().positive().optional(),
      max: z.number().int().positive().optional(),
    })
    .refine(
      (b) => (b.min != null && b.max != null ? b.max >= b.min : true),
      { message: "budget.max must be >= budget.min" }
    )
    .optional(),
  skipSms: z.boolean().default(false),
});

type ValidatedInput = z.infer<typeof CreateLeadSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const UNIT_TYPE_TO_BEDROOMS: Record<string, number> = {
  studio: 0, "1br": 1, "2br": 2, "3br": 3, "4br": 4, "5br": 5,
};

// ─── Helper: log to activity_logs (non-fatal) ─────────────────────────────────

async function logActivity(
  db: SupabaseClient,
  entry: {
    lead_id: string;
    property_id: string;
    action: string;
    actor: "system" | "ai" | "agent";
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await db.from("activity_logs").insert(entry);
  if (error) console.error(`[activity_logs] failed to log "${entry.action}":`, error);
}

// ─── Helper: store outbound message in conversations (non-fatal) ──────────────

async function logConversation(
  db: SupabaseClient,
  entry: {
    lead_id: string;
    property_id: string;
    body: string;
    twilio_sid: string;
  }
) {
  const { error } = await db.from("conversations").insert({
    ...entry,
    direction: "outbound",
    channel: "sms",
    ai_generated: true,
  });
  if (error) console.error("[conversations] failed to log outbound message:", error);
}

// ─── POST /api/leads ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit: 20 lead creations per IP per minute
  const ip = getClientIp(req);
  if (!rateLimit(`leads:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 1. Parse and validate input
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const input: ValidatedInput = parsed.data;
  const db = getSupabaseAdmin();

  // 2. Verify property exists and fetch fields needed for AI + SMS
  const { data: property, error: propertyError } = await db
    .from("properties")
    .select("id, name, phone_number, active_special")
    .eq("id", input.propertyId)
    .single();

  if (propertyError || !property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  // 3. Insert lead
  const { data: lead, error: leadError } = await db
    .from("leads")
    .insert({
      property_id: input.propertyId,
      name: `${input.firstName} ${input.lastName}`.trim(),
      phone: input.phone,
      email: input.email ?? null,
      preferred_contact: input.preferredContactMethod,
      source: input.source,
      status: "new",
      move_in_date: input.desiredMoveDate ?? null,
      bedrooms: input.unitType != null ? UNIT_TYPE_TO_BEDROOMS[input.unitType] : null,
      budget_min: input.budget?.min ?? null,
      budget_max: input.budget?.max ?? null,
    })
    .select()
    .single();

  if (leadError) {
    console.error("[POST /api/leads] lead insert failed:", leadError);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }

  // 4. Log lead_created event
  await logActivity(db, {
    lead_id: lead.id,
    property_id: property.id,
    action: "lead_created",
    actor: "system",
    metadata: { source: input.source, channel: input.preferredContactMethod },
  });

  // 5–9. Generate + send AI welcome SMS (skippable)
  if (input.skipSms) {
    return NextResponse.json({ lead }, { status: 201 });
  }

  let aiMessage: string;
  try {
    const result = await generateLeadReply({
      propertyName: property.name,
      activeSpecial: property.active_special ?? undefined,
      leadName: input.firstName,
      moveInDate: input.desiredMoveDate,
      bedrooms: input.unitType != null ? UNIT_TYPE_TO_BEDROOMS[input.unitType] : undefined,
      budgetMin: input.budget?.min,
      budgetMax: input.budget?.max,
      trigger: "new_lead",
      conversationHistory: "",
    });
    aiMessage = result.message;
  } catch (err) {
    console.error("[POST /api/leads] AI generation failed:", err);
    return NextResponse.json({ lead }, { status: 201 });
  }

  let twilioSid: string;
  try {
    const smsResult = await sendSms({
      to: lead.phone,
      body: aiMessage,
      from: property.phone_number,
    });
    twilioSid = smsResult.sid;
  } catch (err) {
    console.error("[POST /api/leads] SMS send failed:", err);
    return NextResponse.json({ lead }, { status: 201 });
  }

  await logConversation(db, {
    lead_id: lead.id,
    property_id: property.id,
    body: aiMessage,
    twilio_sid: twilioSid,
  });

  await logActivity(db, {
    lead_id: lead.id,
    property_id: property.id,
    action: "sms_sent",
    actor: "ai",
    metadata: { trigger: "new_lead", preview: aiMessage.slice(0, 100) },
  });

  await db
    .from("leads")
    .update({ status: "contacted", last_contacted_at: new Date().toISOString() })
    .eq("id", lead.id);

  return NextResponse.json(
    { lead: { ...lead, status: "contacted" }, message: aiMessage },
    { status: 201 }
  );
}

// ─── GET /api/leads ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const status = searchParams.get("status");

  const db = getSupabaseAdmin();

  let query = db
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (propertyId) query = query.eq("property_id", propertyId);
  if (status) query = query.eq("status", status);

  const { data: leads, error } = await query;

  if (error) {
    console.error("[GET /api/leads] query error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }

  return NextResponse.json({ leads });
}
