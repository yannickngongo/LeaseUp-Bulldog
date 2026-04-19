-- ============================================================
-- LeaseUp Bulldog — Migration 006: AI Marketing Engine
-- Run AFTER sql/005_handoffs.sql
-- ============================================================

-- ─── CAMPAIGNS ────────────────────────────────────────────────────────────────

create table if not exists campaigns (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  property_id         uuid not null references properties(id) on delete cascade,
  operator_id         uuid not null references operators(id) on delete cascade,

  -- Intake data (what the operator told us)
  current_special     text,
  target_renter_type  text,
  pricing_summary     text,
  occupancy_goal      text,
  urgency             text not null default 'normal'
                        check (urgency in ('low', 'normal', 'high', 'urgent')),

  -- AI strategy output
  recommended_channels  text[],   -- ['facebook', 'google', 'instagram']
  messaging_angle       text,

  -- Campaign state
  status              text not null default 'draft'
                        check (status in ('draft', 'pending_approval', 'approved', 'active', 'paused', 'completed')),
  approved_at         timestamptz,
  approved_by         text,       -- operator email

  -- Tracking
  total_leads_generated integer not null default 0,
  total_spend_cents     integer not null default 0
);

create index if not exists campaigns_property_id_idx  on campaigns (property_id);
create index if not exists campaigns_operator_id_idx  on campaigns (operator_id);
create index if not exists campaigns_status_idx       on campaigns (status);

create trigger trg_campaigns_updated_at
  before update on campaigns
  for each row execute function set_updated_at();


-- ─── AD_VARIATIONS ────────────────────────────────────────────────────────────
-- 3–5 AI-generated ad variations per campaign. User approves individual ads.

create table if not exists ad_variations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  variation_num smallint not null,  -- 1–5

  -- Ad content (AI-generated)
  headline      text not null,
  primary_text  text not null,
  cta           text not null,
  channel       text not null,  -- 'facebook' | 'google' | 'instagram'

  -- Approval
  approved      boolean not null default false,
  approved_at   timestamptz,
  approved_by   text
);

create index if not exists ad_variations_campaign_id_idx on ad_variations (campaign_id);


-- ─── Extend leads with campaign attribution ───────────────────────────────────

alter table leads
  add column if not exists campaign_id   uuid references campaigns(id),
  add column if not exists utm_source    text,
  add column if not exists utm_medium    text,
  add column if not exists utm_campaign  text;

create index if not exists leads_campaign_id_idx on leads (campaign_id);
