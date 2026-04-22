-- Adds integration columns to properties and subscription_status to operators.
-- Run in Supabase SQL Editor: https://app.supabase.com → SQL Editor

-- Properties: Facebook Lead Ads token + operator notification email
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS facebook_access_token TEXT,
  ADD COLUMN IF NOT EXISTS notify_email          TEXT;

-- Operators: subscription lifecycle tracking
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Set trial_ends_at = 14 days from created_at for any operators without one
UPDATE operators
  SET trial_ends_at = created_at + INTERVAL '14 days'
  WHERE trial_ends_at IS NULL;
