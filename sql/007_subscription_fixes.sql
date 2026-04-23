-- LeaseUp Bulldog — Subscription schema fixes
-- Run in Supabase SQL Editor

-- Add stripe_subscription_id to operators (used by /api/setup)
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add stripe_subscription_id to billing_subscriptions (set from checkout webhook)
ALTER TABLE billing_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Widen status check to include 'trialing' (set during checkout before trial ends)
ALTER TABLE billing_subscriptions
  DROP CONSTRAINT IF EXISTS billing_subscriptions_status_check;

ALTER TABLE billing_subscriptions
  ADD CONSTRAINT billing_subscriptions_status_check
  CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled'));
