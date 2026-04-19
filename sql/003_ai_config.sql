-- ============================================================
-- LeaseUp Bulldog — Migration 003: Property AI Config + Lead Controls
-- Run AFTER sql/002_billing.sql
-- ============================================================

-- ─── Extend leads with AI control flags ───────────────────────────────────────

alter table leads
  add column if not exists opt_out         boolean not null default false,
  add column if not exists opt_out_at      timestamptz,
  add column if not exists human_takeover  boolean not null default false,
  add column if not exists ai_paused       boolean not null default false;

create index if not exists leads_opt_out_idx        on leads (opt_out) where opt_out = true;
create index if not exists leads_human_takeover_idx on leads (human_takeover) where human_takeover = true;

-- ─── Extend properties with notification target ───────────────────────────────

alter table properties
  add column if not exists notify_email text,
  add column if not exists timezone     text not null default 'America/New_York';


-- ─── PROPERTY_AI_CONFIGS ──────────────────────────────────────────────────────
-- One row per property. Defines exactly what the AI is allowed to say.
-- AI must ONLY use fields that are explicitly set — never invent.

create table if not exists property_ai_configs (
  id                          uuid primary key default gen_random_uuid(),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  property_id                 uuid not null unique references properties(id) on delete cascade,

  -- What the AI can reference
  leasing_special_title       text,
  leasing_special_description text,
  pricing_notes               text,     -- e.g. "1BRs from $1,200, 2BRs from $1,500"
  application_link            text,
  tour_instructions           text,     -- e.g. "Tours Mon–Fri 9am–5pm, call to schedule"
  office_hours                text,

  -- FAQ pairs: [{question: string, answer: string}]
  approved_faqs               jsonb not null default '[]'::jsonb,

  -- Guardrail notes (injected into the AI prompt as hard constraints)
  objection_handling_notes    text,
  allowed_messaging           text,     -- what the AI is allowed to say
  disallowed_claims           text,     -- what the AI must never claim
  escalation_triggers         text[]    -- phrases/topics that force human handoff
);

create trigger trg_property_ai_configs_updated_at
  before update on property_ai_configs
  for each row execute function set_updated_at();
