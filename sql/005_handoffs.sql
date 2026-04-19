-- ============================================================
-- LeaseUp Bulldog — Migration 005: Human Takeover / Handoff Events
-- Run AFTER sql/004_follow_up.sql
-- ============================================================

create table if not exists handoff_events (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  lead_id           uuid not null references leads(id) on delete cascade,
  property_id       uuid not null references properties(id) on delete cascade,

  -- Why the escalation happened
  reason            text not null,
  -- 'asked_for_human' | 'frustration_detected' | 'policy_question' |
  -- 'technical_question' | 'escalation_trigger' | 'manual'
  trigger_message   text,     -- the lead's message that caused the escalation
  triggered_by      text not null default 'ai',  -- 'ai' | 'system' | 'manual'

  -- Assignment
  assigned_to       text,     -- operator email
  assigned_at       timestamptz,

  -- Resolution
  status            text not null default 'open'
                      check (status in ('open', 'in_progress', 'resolved', 'returned_to_ai')),
  resolved_at       timestamptz,
  resolution_notes  text
);

create index if not exists handoff_events_lead_id_idx     on handoff_events (lead_id);
create index if not exists handoff_events_property_id_idx on handoff_events (property_id);
create index if not exists handoff_events_status_idx      on handoff_events (status);
-- Dashboard query: open handoffs per property
create index if not exists handoff_events_open_idx
  on handoff_events (property_id, created_at)
  where status in ('open', 'in_progress');

create trigger trg_handoff_events_updated_at
  before update on handoff_events
  for each row execute function set_updated_at();
