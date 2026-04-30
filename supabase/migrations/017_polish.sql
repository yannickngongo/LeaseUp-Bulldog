-- Migration 017: Polish — instrumentation, retention, attribution
-- Adds columns + tables for time-to-first-lead tracking, UTM attribution,
-- and welcome-SMS dedup.

-- ─── operators: signup-time + welcome SMS state ──────────────────────────────
ALTER TABLE operators ADD COLUMN IF NOT EXISTS welcome_sms_sent_at  TIMESTAMPTZ;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS signup_utm_source    TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS signup_utm_medium    TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS signup_utm_campaign  TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS signup_referrer      TEXT;

-- ─── operator_milestones: track key first-time events ────────────────────────
-- Used for time-to-first-lead, time-to-first-tour, etc.
CREATE TABLE IF NOT EXISTS operator_milestones (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   UUID         NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  milestone     TEXT         NOT NULL,    -- 'setup_complete', 'first_lead', 'first_tour', 'first_lease'
  achieved_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  metadata      JSONB,
  UNIQUE(operator_id, milestone)
);

CREATE INDEX IF NOT EXISTS idx_operator_milestones_operator ON operator_milestones(operator_id);
