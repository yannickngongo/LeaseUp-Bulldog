// Single source of truth for all TypeScript types.
// These mirror the Supabase schema in sql/schema.sql exactly.
// Import from "@/lib/types" — never define entity shapes inline.

// ─── Operators ────────────────────────────────────────────────────────────────

export interface Operator {
  id: string;
  created_at: string;
  name: string;
  email: string;
  plan: "starter" | "pro";
}

// ─── Properties ───────────────────────────────────────────────────────────────

export interface Property {
  id: string;
  created_at: string;
  updated_at: string;
  operator_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone_number: string;   // Twilio number — never promise specials not stored here
  active_special?: string;
  website_url?: string;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "new"            // lead created, no contact made yet
  | "contacted"      // we sent the first outbound SMS
  | "engaged"        // lead replied — two-way conversation started
  | "tour_scheduled" // tour has been booked
  | "applied"        // application started
  | "won"            // application completed, lease signed
  | "lost";          // dropped out, unresponsive, or disqualified

export type QualificationLevel = "hot" | "warm" | "cold";
export type PreferredContact = "sms" | "email" | "call";

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  property_id: string;
  name: string;
  phone: string;
  email?: string;
  preferred_contact: PreferredContact;
  source: string;
  status: LeadStatus;
  qualification_level?: QualificationLevel;
  move_in_date?: string;      // ISO date e.g. "2025-08-01"
  bedrooms?: number;          // 0 = studio
  budget_min?: number;
  budget_max?: number;
  pets?: boolean;
  notes?: string;
  ai_score?: number;          // 1–10
  ai_summary?: string;
  follow_up_at?: string;
  last_contacted_at?: string;
}

// ─── Conversations ────────────────────────────────────────────────────────────

export type MessageDirection = "inbound" | "outbound";
export type MessageChannel = "sms" | "email";

export interface Conversation {
  id: string;
  created_at: string;
  lead_id: string;
  property_id: string;
  direction: MessageDirection;
  channel: MessageChannel;
  body: string;
  twilio_sid?: string;
  ai_generated: boolean;
}

// ─── Tours ────────────────────────────────────────────────────────────────────

export type TourStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface Tour {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string;
  property_id: string;
  scheduled_at: string;
  status: TourStatus;
  notes?: string;
}

// ─── Applications ─────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | "started"
  | "submitted"
  | "approved"
  | "denied"
  | "withdrawn";

export interface Application {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string;
  property_id: string;
  unit_number?: string;
  status: ApplicationStatus;
  submitted_at?: string;
  notes?: string;
}

// ─── Activity Logs ────────────────────────────────────────────────────────────

export type ActivityActor = "system" | "ai" | "agent";

export interface ActivityLog {
  id: string;
  created_at: string;
  lead_id?: string;
  property_id?: string;
  action: string;
  actor: ActivityActor;
  metadata?: Record<string, unknown>;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateLeadPayload {
  property_id: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  preferred_contact?: PreferredContact;
  move_in_date?: string;
  budget_min?: number;
  budget_max?: number;
  bedrooms?: number;
  pets?: boolean;
  notes?: string;
}

export interface TwilioInboundPayload {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
}

export interface AIRespondPayload {
  lead_id: string;
  property_id: string;
  trigger: "new_lead" | "inbound_sms" | "follow_up";
}
