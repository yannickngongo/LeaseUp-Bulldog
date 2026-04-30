-- Migration 013: Marketing Add-on subscription + ad spend tracking
--
-- Adds Stripe subscription columns to operators (one customer + one subscription per operator),
-- and per-campaign ad spend tracking columns so the daily cron can compute deltas
-- and report usage to Stripe's metered billing.

-- ─── operators: subscription columns ─────────────────────────────────────────
ALTER TABLE operators ADD COLUMN IF NOT EXISTS stripe_customer_id                  TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS stripe_subscription_id              TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS stripe_subscription_item_metered_id TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS marketing_subscription_status       TEXT
  CHECK (marketing_subscription_status IN ('inactive', 'active', 'past_due', 'canceled', 'trialing'))
  DEFAULT 'inactive';
ALTER TABLE operators ADD COLUMN IF NOT EXISTS marketing_subscribed_at             TIMESTAMPTZ;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS marketing_subscription_ends_at      TIMESTAMPTZ;

-- ─── campaigns: ad spend tracking ────────────────────────────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_spend_cents       INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS last_synced_spend_cents INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS last_synced_at          TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS lub_fee_cents           INTEGER DEFAULT 0;

-- ─── ad_spend_sync_log: audit every cron run ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_spend_sync_log (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID         REFERENCES campaigns(id) ON DELETE CASCADE,
  operator_id     UUID         REFERENCES operators(id) ON DELETE CASCADE,
  delta_cents     INTEGER      NOT NULL,
  total_spend_cents INTEGER    NOT NULL,
  reported_to_stripe BOOLEAN   NOT NULL DEFAULT false,
  stripe_usage_record_id TEXT,
  error           TEXT,
  synced_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_spend_sync_log_campaign ON ad_spend_sync_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_sync_log_operator ON ad_spend_sync_log(operator_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_sync_log_synced_at ON ad_spend_sync_log(synced_at DESC);
