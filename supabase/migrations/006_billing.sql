-- LeaseUp Bulldog — Billing tables + ad account columns
-- Run in Supabase SQL Editor: https://app.supabase.com → SQL Editor

-- ── Ad account IDs per operator (for automated spend pull) ────────────────────
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS meta_ad_account_id    TEXT,  -- e.g. "act_12345678"
  ADD COLUMN IF NOT EXISTS google_ads_customer_id TEXT; -- e.g. "123-456-7890"

-- ── billing_subscriptions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  operator_id               UUID        NOT NULL UNIQUE REFERENCES operators(id) ON DELETE CASCADE,
  setup_fee_paid            BOOLEAN     NOT NULL DEFAULT false,
  setup_fee_paid_at         TIMESTAMPTZ,
  setup_fee_amount          INTEGER     NOT NULL DEFAULT 100000,  -- $1,000 cents
  platform_fee              INTEGER     NOT NULL DEFAULT 100000,  -- $1,000/mo cents
  marketing_addon           BOOLEAN     NOT NULL DEFAULT false,
  marketing_fee             INTEGER     NOT NULL DEFAULT 50000,   -- $500/mo cents
  performance_fee_per_lease INTEGER     NOT NULL DEFAULT 20000,   -- $200 cents
  billing_cycle_start       DATE        NOT NULL DEFAULT CURRENT_DATE,
  status                    TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS billing_subscriptions_operator_id_idx
  ON billing_subscriptions (operator_id);

-- ── leases ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leases (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_id                UUID        NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  property_id            UUID        NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  operator_id            UUID        NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
  lease_signed_date      DATE        NOT NULL,
  rent_amount            INTEGER     NOT NULL, -- cents
  unit_number            TEXT,
  lease_start_date       DATE,
  lease_end_date         DATE,
  attribution_source     TEXT        NOT NULL DEFAULT 'lub',
  created_by             TEXT        NOT NULL,
  first_contact_date     TIMESTAMPTZ,
  attribution_window_end TIMESTAMPTZ,
  is_billable            BOOLEAN     NOT NULL DEFAULT false,
  notes                  TEXT
);

CREATE INDEX IF NOT EXISTS leases_operator_id_idx    ON leases (operator_id);
CREATE INDEX IF NOT EXISTS leases_property_id_idx    ON leases (property_id);
CREATE INDEX IF NOT EXISTS leases_signed_date_idx    ON leases (lease_signed_date);

-- ── performance_fees ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_fees (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_id      UUID        NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  operator_id   UUID        NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  property_id   UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amount        INTEGER     NOT NULL DEFAULT 20000, -- cents
  billing_month TEXT        NOT NULL,               -- 'YYYY-MM'
  status        TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invoiced', 'paid'))
);

CREATE INDEX IF NOT EXISTS performance_fees_operator_id_idx ON performance_fees (operator_id);
CREATE INDEX IF NOT EXISTS performance_fees_billing_month_idx ON performance_fees (billing_month);

-- ── billing_periods ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_periods (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  operator_id             UUID        NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  period_start            DATE        NOT NULL,
  period_end              DATE        NOT NULL,
  platform_fee            INTEGER     NOT NULL DEFAULT 0,
  marketing_addon_fee     INTEGER     NOT NULL DEFAULT 0,
  ad_spend_cents          INTEGER     NOT NULL DEFAULT 0,
  ad_spend_fee_cents      INTEGER     NOT NULL DEFAULT 0, -- 5% of ad_spend_cents
  performance_lease_count INTEGER     NOT NULL DEFAULT 0,
  performance_fee_total   INTEGER     NOT NULL DEFAULT 0,
  total_due               INTEGER     NOT NULL DEFAULT 0,
  status                  TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized', 'paid')),
  stripe_invoice_id       TEXT,
  stripe_invoice_url      TEXT,
  notes                   TEXT,
  UNIQUE (operator_id, period_start)
);

-- Add new columns if table already existed without them
ALTER TABLE billing_periods
  ADD COLUMN IF NOT EXISTS ad_spend_cents      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ad_spend_fee_cents  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_url  TEXT;

CREATE INDEX IF NOT EXISTS billing_periods_operator_id_idx ON billing_periods (operator_id);
CREATE INDEX IF NOT EXISTS billing_periods_period_start_idx ON billing_periods (period_start);
