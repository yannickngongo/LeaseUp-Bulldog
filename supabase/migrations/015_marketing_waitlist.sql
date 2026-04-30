-- Migration 015: Marketing Add-on waitlist
-- Captures interest in the upcoming Marketing Add-on while it's gated as
-- "Coming Soon". When the feature launches, email everyone on this list.

CREATE TABLE IF NOT EXISTS marketing_waitlist (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT         NOT NULL UNIQUE,
  operator_id     UUID         REFERENCES operators(id) ON DELETE SET NULL,
  property_count  INTEGER,
  notes           TEXT,
  source          TEXT,        -- "marketing_tab" | "billing_page" | "pricing_page" | "other"
  notified        BOOLEAN      NOT NULL DEFAULT false,
  notified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_waitlist_created_at ON marketing_waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_waitlist_notified   ON marketing_waitlist(notified) WHERE notified = false;
