-- ============================================================
-- LeaseUp Bulldog — Migration 002: Billing & Performance Fees
-- Run AFTER sql/schema.sql
-- ============================================================

-- ─── Extend leads with attribution tracking ───────────────────────────────────

alter table leads
  add column if not exists first_contact_date     timestamptz,
  add column if not exists attribution_window_end  timestamptz;  -- first_contact_date + 30 days

create index if not exists leads_first_contact_date_idx on leads (first_contact_date);

-- ─── LEASES ───────────────────────────────────────────────────────────────────
-- One row per signed lease. is_billable is computed and locked at insert time.

create table if not exists leases (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  lead_id                 uuid not null references leads(id),
  property_id             uuid not null references properties(id),
  operator_id             uuid not null references operators(id),

  -- Lease details
  lease_signed_date       date not null,
  rent_amount             integer not null check (rent_amount > 0),  -- cents
  unit_number             text,
  lease_start_date        date,
  lease_end_date          date,

  -- Attribution
  attribution_source      text not null default 'lub'
                            check (attribution_source in ('lub', 'manual', 'other')),
  created_by              text not null,  -- operator email or 'system'

  -- Attribution snapshot (locked at creation, never updated)
  first_contact_date      timestamptz,
  attribution_window_end  timestamptz,
  is_billable             boolean not null default false,

  notes                   text
);

create index if not exists leases_lead_id_idx        on leases (lead_id);
create index if not exists leases_property_id_idx    on leases (property_id);
create index if not exists leases_operator_id_idx    on leases (operator_id);
create index if not exists leases_signed_date_idx    on leases (lease_signed_date);
create index if not exists leases_is_billable_idx    on leases (is_billable) where is_billable = true;

create trigger trg_leases_updated_at
  before update on leases
  for each row execute function set_updated_at();


-- ─── BILLING_SUBSCRIPTIONS ────────────────────────────────────────────────────
-- One row per operator. Tracks which plan features are active.

create table if not exists billing_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  operator_id              uuid not null unique references operators(id) on delete cascade,

  setup_fee_paid           boolean not null default false,
  setup_fee_paid_at        timestamptz,
  setup_fee_amount         integer not null default 100000,   -- $1,000 in cents

  platform_fee             integer not null default 100000,   -- $1,000/mo in cents
  marketing_addon          boolean not null default false,
  marketing_fee            integer not null default 200000,   -- $2,000/mo in cents
  performance_fee_per_lease integer not null default 20000,  -- $200 in cents

  billing_cycle_start      date not null default current_date,
  status                   text not null default 'active'
                             check (status in ('active', 'past_due', 'cancelled'))
);

create trigger trg_billing_subscriptions_updated_at
  before update on billing_subscriptions
  for each row execute function set_updated_at();


-- ─── PERFORMANCE_FEES ─────────────────────────────────────────────────────────
-- One row per billable lease. lease_id is unique — enforces one fee per lease.

create table if not exists performance_fees (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  lease_id      uuid not null unique references leases(id),
  operator_id   uuid not null references operators(id),
  property_id   uuid not null references properties(id),
  amount        integer not null default 20000,  -- $200 in cents
  billing_month text not null,                   -- 'YYYY-MM'
  status        text not null default 'pending'
                  check (status in ('pending', 'invoiced', 'paid'))
);

create index if not exists perf_fees_operator_id_idx    on performance_fees (operator_id);
create index if not exists perf_fees_property_id_idx    on performance_fees (property_id);
create index if not exists perf_fees_billing_month_idx  on performance_fees (billing_month);
create index if not exists perf_fees_status_idx         on performance_fees (status);


-- ─── BILLING_PERIODS ──────────────────────────────────────────────────────────
-- Monthly invoice summary per operator. Unique on (operator_id, period_start).

create table if not exists billing_periods (
  id                       uuid primary key default gen_random_uuid(),
  created_at               timestamptz not null default now(),
  operator_id              uuid not null references operators(id),
  period_start             date not null,
  period_end               date not null,

  platform_fee             integer not null default 0,
  marketing_addon_fee      integer not null default 0,
  performance_lease_count  integer not null default 0,
  performance_fee_total    integer not null default 0,
  total_due                integer not null default 0,

  status                   text not null default 'draft'
                             check (status in ('draft', 'finalized', 'paid')),
  notes                    text,

  unique (operator_id, period_start)
);

create index if not exists billing_periods_operator_id_idx on billing_periods (operator_id);
create index if not exists billing_periods_status_idx      on billing_periods (status);
