-- Migration 016: Webhook idempotency
-- Tracks unique webhook event IDs from Stripe + Meta + Google so we can
-- safely no-op on duplicate deliveries (which happen — webhook providers
-- routinely retry on timeouts).

CREATE TABLE IF NOT EXISTS webhook_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  source      TEXT         NOT NULL,         -- 'stripe' | 'meta' | 'google'
  event_id    TEXT         NOT NULL,         -- provider's unique event ID
  event_type  TEXT,                          -- e.g. 'invoice.payment_succeeded'
  status      TEXT         NOT NULL DEFAULT 'processed',  -- 'processed' | 'failed' | 'skipped'
  payload     JSONB,                         -- truncated body for debugging
  error       TEXT,
  received_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(source, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source_type  ON webhook_events(source, event_type);
