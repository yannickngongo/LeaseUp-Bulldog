-- LeaseUp Bulldog — Initial Schema
-- Run this in your Supabase SQL editor: https://app.supabase.com → SQL Editor

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Leads table
create table leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text not null,
  phone         text not null,
  email         text,
  source        text default 'manual',         -- website, zillow, manual, etc.
  status        text not null default 'new',   -- new | contacted | qualified | unqualified | touring | applied | leased | lost
  move_in_date  date,
  budget_min    integer,
  budget_max    integer,
  pets          boolean,
  bedrooms      integer,
  notes         text,
  ai_score      integer check (ai_score between 1 and 10),
  ai_summary    text,
  follow_up_at  timestamptz,
  last_contacted_at timestamptz
);

-- Conversations table (SMS / email history per lead)
create table conversations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lead_id     uuid not null references leads(id) on delete cascade,
  direction   text not null check (direction in ('inbound', 'outbound')),
  channel     text not null check (channel in ('sms', 'email')),
  body        text not null,
  twilio_sid  text
);

-- Indexes for common queries
create index on leads (status);
create index on leads (follow_up_at);
create index on leads (phone);
create index on conversations (lead_id);
