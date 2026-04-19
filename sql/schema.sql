-- ============================================================
-- LeaseUp Bulldog — v1 Schema
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Order matters — tables are created dependency-first:
--   operators → properties → leads → conversations
--                                  → tours
--                                  → applications
--                                  → activity_logs
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ============================================================
-- OPERATORS
-- Top-level account. One operator owns many properties.
-- ============================================================

create table operators (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null unique,
  plan        text not null default 'starter' -- 'starter' | 'pro'
);


-- ============================================================
-- PROPERTIES
-- A physical apartment community managed by an operator.
-- Each property gets its own Twilio phone number.
-- ============================================================

create table properties (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  operator_id     uuid not null references operators(id) on delete cascade,
  name            text not null,
  address         text not null,
  city            text not null,
  state           text not null,
  zip             text not null,
  phone_number    text not null unique, -- Twilio number e.g. '+17025550100'
  active_special  text,                -- only surface in SMS if this is set
  website_url     text
);

create index on properties (operator_id);


-- ============================================================
-- LEADS
-- A prospective renter. Always belongs to a property.
-- ============================================================

create table leads (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  property_id         uuid not null references properties(id) on delete cascade,

  -- Contact info
  name                text not null,
  phone               text not null,
  email               text,
  preferred_contact   text not null default 'sms', -- 'sms' | 'email' | 'call'

  -- Pipeline state
  source              text not null default 'manual',
    -- 'website' | 'zillow' | 'apartments.com' | 'facebook' | 'manual' | etc.
  status              text not null default 'new',
    -- 'new' | 'contacted' | 'engaged' | 'tour_scheduled' | 'applied' | 'won' | 'lost'
  qualification_level text,
    -- 'hot' | 'warm' | 'cold' — readable label from AI score

  -- Qualification fields (collected over conversation)
  move_in_date        date,
  bedrooms            smallint check (bedrooms between 0 and 10), -- 0 = studio
  budget_min          integer check (budget_min > 0),
  budget_max          integer check (budget_max > 0),
  pets                boolean,

  -- AI output
  ai_score            smallint check (ai_score between 1 and 10),
  ai_summary          text,

  -- Timing
  follow_up_at        timestamptz,
  last_contacted_at   timestamptz,

  -- Internal
  notes               text
);

create index on leads (property_id);
create index on leads (status);
create index on leads (phone);
create index on leads (follow_up_at);


-- ============================================================
-- CONVERSATIONS
-- Every inbound and outbound message. Append-only, never deleted.
-- property_id is denormalized for fast property-level queries.
-- ============================================================

create table conversations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  lead_id       uuid not null references leads(id) on delete cascade,
  property_id   uuid not null references properties(id) on delete cascade,
  direction     text not null check (direction in ('inbound', 'outbound')),
  channel       text not null check (channel in ('sms', 'email')),
  body          text not null,
  twilio_sid    text,         -- Twilio message SID for delivery tracking
  ai_generated  boolean not null default false
);

create index on conversations (lead_id);
create index on conversations (property_id);


-- ============================================================
-- TOURS
-- A scheduled, completed, cancelled, or no-show tour.
-- ============================================================

create table tours (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  lead_id       uuid not null references leads(id) on delete cascade,
  property_id   uuid not null references properties(id) on delete cascade,
  scheduled_at  timestamptz not null,
  status        text not null default 'scheduled',
    -- 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes         text
);

create index on tours (lead_id);
create index on tours (property_id);
create index on tours (scheduled_at);


-- ============================================================
-- APPLICATIONS
-- A rental application started or submitted by a lead.
-- ============================================================

create table applications (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  lead_id       uuid not null references leads(id) on delete cascade,
  property_id   uuid not null references properties(id) on delete cascade,
  unit_number   text,
  status        text not null default 'started',
    -- 'started' | 'submitted' | 'approved' | 'denied' | 'withdrawn'
  submitted_at  timestamptz, -- null until the application is actually submitted
  notes         text
);

create index on applications (lead_id);
create index on applications (property_id);
create index on applications (status);


-- ============================================================
-- ACTIVITY_LOGS
-- Append-only audit trail. One row per meaningful event.
-- Both lead_id and property_id are nullable — some events
-- are property-level (e.g. new property created) with no lead.
-- ============================================================

create table activity_logs (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  lead_id       uuid references leads(id) on delete set null,
  property_id   uuid references properties(id) on delete set null,
  action        text not null,
    -- 'lead_created' | 'sms_sent' | 'sms_received' | 'ai_qualified'
    -- | 'tour_scheduled' | 'tour_completed' | 'application_started'
    -- | 'application_submitted' | 'status_changed' | etc.
  actor         text not null default 'system',
    -- 'system' | 'ai' | 'agent'
  metadata      jsonb
    -- flexible payload e.g. { "score": 8, "old_status": "new", "new_status": "qualified" }
);

create index on activity_logs (lead_id);
create index on activity_logs (property_id);
create index on activity_logs (action);
create index on activity_logs (created_at);


-- ============================================================
-- AUTO-UPDATE updated_at
-- Trigger function that keeps updated_at current on any row change.
-- Applied to: properties, leads, tours, applications
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_properties_updated_at
  before update on properties
  for each row execute function set_updated_at();

create trigger trg_leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

create trigger trg_tours_updated_at
  before update on tours
  for each row execute function set_updated_at();

create trigger trg_applications_updated_at
  before update on applications
  for each row execute function set_updated_at();
