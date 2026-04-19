export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "unqualified"
  | "touring"
  | "applied"
  | "leased"
  | "lost";

export type MessageDirection = "inbound" | "outbound";
export type MessageChannel = "sms" | "email";

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email?: string;
  source?: string; // e.g. "website", "zillow", "manual"
  status: LeadStatus;
  move_in_date?: string;
  budget_min?: number;
  budget_max?: number;
  pets?: boolean;
  bedrooms?: number;
  notes?: string;
  ai_score?: number; // 1–10 quality score
  ai_summary?: string;
  follow_up_at?: string;
  last_contacted_at?: string;
}

export interface Conversation {
  id: string;
  lead_id: string;
  created_at: string;
  direction: MessageDirection;
  channel: MessageChannel;
  body: string;
  twilio_sid?: string;
}

// Payload for creating a new lead (subset of Lead)
export type NewLeadPayload = Pick<Lead, "name" | "phone"> &
  Partial<Omit<Lead, "id" | "created_at" | "status">>;
