-- Adds Stripe billing and activation columns to the operators table.
-- Run in Supabase SQL Editor: https://app.supabase.com → SQL Editor

ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent   TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_day3_sent    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_day7_sent    BOOLEAN NOT NULL DEFAULT false;
