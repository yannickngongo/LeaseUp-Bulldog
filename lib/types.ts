// Single source of truth for all TypeScript types.
// These mirror the Supabase schema exactly.
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
  phone_number: string;
  active_special?: string;
  website_url?: string;
  notify_email?: string;
  timezone: string;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "new"
  | "contacted"
  | "engaged"
  | "tour_scheduled"
  | "applied"
  | "won"
  | "lost";

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
  move_in_date?: string;
  bedrooms?: number;
  budget_min?: number;
  budget_max?: number;
  pets?: boolean;
  notes?: string;
  ai_score?: number;
  ai_summary?: string;
  follow_up_at?: string;
  last_contacted_at?: string;
  // Attribution (002_billing)
  first_contact_date?: string;
  attribution_window_end?: string;
  // AI controls (003_ai_config)
  opt_out: boolean;
  opt_out_at?: string;
  human_takeover: boolean;
  ai_paused: boolean;
  // Marketing (006_marketing)
  campaign_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
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

// ─── Billing ──────────────────────────────────────────────────────────────────

export type AttributionSource = "lub" | "manual" | "other";

export interface Lease {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string;
  property_id: string;
  operator_id: string;
  lease_signed_date: string;
  rent_amount: number;          // cents
  unit_number?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  attribution_source: AttributionSource;
  created_by: string;
  first_contact_date?: string;
  attribution_window_end?: string;
  is_billable: boolean;
  notes?: string;
}

export interface BillingSubscription {
  id: string;
  created_at: string;
  operator_id: string;
  setup_fee_paid: boolean;
  setup_fee_paid_at?: string;
  setup_fee_amount: number;
  platform_fee: number;
  marketing_addon: boolean;
  marketing_fee: number;
  performance_fee_per_lease: number;
  billing_cycle_start: string;
  status: "active" | "past_due" | "cancelled";
}

export type PerformanceFeeStatus = "pending" | "invoiced" | "paid";

export interface PerformanceFee {
  id: string;
  created_at: string;
  lease_id: string;
  operator_id: string;
  property_id: string;
  amount: number;        // cents
  billing_month: string; // 'YYYY-MM'
  status: PerformanceFeeStatus;
}

export type BillingPeriodStatus = "draft" | "finalized" | "paid";

export interface BillingPeriod {
  id: string;
  created_at: string;
  operator_id: string;
  period_start: string;
  period_end: string;
  platform_fee: number;
  marketing_addon_fee: number;
  performance_lease_count: number;
  performance_fee_total: number;
  total_due: number;
  status: BillingPeriodStatus;
  notes?: string;
}

// ─── Property AI Config ───────────────────────────────────────────────────────

export interface ApprovedFAQ {
  question: string;
  answer: string;
}

export interface PropertyAIConfig {
  id: string;
  created_at: string;
  updated_at: string;
  property_id: string;
  leasing_special_title?: string;
  leasing_special_description?: string;
  pricing_notes?: string;
  application_link?: string;
  tour_instructions?: string;
  office_hours?: string;
  approved_faqs: ApprovedFAQ[];
  objection_handling_notes?: string;
  allowed_messaging?: string;
  disallowed_claims?: string;
  escalation_triggers?: string[];
}

// ─── Follow-Up Tasks ──────────────────────────────────────────────────────────

export type FollowUpStatus =
  | "pending"
  | "executing"
  | "completed"
  | "cancelled"
  | "failed";

export type FollowUpTrigger =
  | "first_contact"
  | "follow_up_1"
  | "follow_up_2"
  | "follow_up_3"
  | "follow_up_4"
  | "monthly_touch";

export type FollowUpPhase = "burst" | "nurture";

export type CancelReason =
  | "opted_out"
  | "human_takeover"
  | "lease_signed"
  | "manual_pause"
  | "lead_lost"
  | "replied";

export interface FollowUpTask {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string;
  property_id: string;
  scheduled_for: string;
  trigger_reason: FollowUpTrigger;
  attempt_number: number;
  status: FollowUpStatus;
  executed_at?: string;
  result_message?: string;
  twilio_sid?: string;
  error_message?: string;
  cancelled_at?: string;
  cancelled_reason?: CancelReason;
}

// ─── Handoff Events ───────────────────────────────────────────────────────────

export type EscalationReason =
  | "asked_for_human"
  | "frustration_detected"
  | "policy_question"
  | "technical_question"
  | "escalation_trigger"
  | "manual";

export type HandoffStatus = "open" | "in_progress" | "resolved" | "returned_to_ai";

export interface HandoffEvent {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string;
  property_id: string;
  reason: EscalationReason;
  trigger_message?: string;
  triggered_by: "ai" | "system" | "manual";
  assigned_to?: string;
  assigned_at?: string;
  status: HandoffStatus;
  resolved_at?: string;
  resolution_notes?: string;
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export type CampaignUrgency = "low" | "normal" | "high" | "urgent";
export type CampaignStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "active"
  | "paused"
  | "completed";

export interface Campaign {
  id: string;
  created_at: string;
  updated_at: string;
  property_id: string;
  operator_id: string;
  current_special?: string;
  target_renter_type?: string;
  pricing_summary?: string;
  occupancy_goal?: string;
  urgency: CampaignUrgency;
  recommended_channels?: string[];
  messaging_angle?: string;
  status: CampaignStatus;
  approved_at?: string;
  approved_by?: string;
  total_leads_generated: number;
  total_spend_cents: number;
}

export type AdChannel = "facebook" | "google" | "instagram";

export interface AdVariation {
  id: string;
  created_at: string;
  campaign_id: string;
  variation_num: number;
  headline: string;
  primary_text: string;
  cta: string;
  channel: AdChannel;
  approved: boolean;
  approved_at?: string;
  approved_by?: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  leases_attributed: number;
  performance_fees_cents: number;
  lead_conversion_rate: number;   // 0–1
  avg_response_time_minutes: number;
  tours_booked: number;
  application_starts: number;
  total_leads: number;
  active_conversations: number;
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
  campaign_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
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

export interface RecordLeasePayload {
  lead_id: string;
  property_id: string;
  operator_id: string;
  lease_signed_date: string;
  rent_amount: number;
  unit_number?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  attribution_source?: AttributionSource;
  created_by: string;
  notes?: string;
}

export interface MarketingIntake {
  property_id: string;
  operator_id: string;
  current_special?: string;
  target_renter_type?: string;
  pricing_summary?: string;
  occupancy_goal?: string;
  urgency?: CampaignUrgency;
}
