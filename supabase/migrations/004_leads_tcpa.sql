-- Adds TCPA consent tracking columns to the leads table.
-- Run in Supabase SQL Editor: https://app.supabase.com → SQL Editor

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS tcpa_consent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tcpa_consent_ip     TEXT,
  ADD COLUMN IF NOT EXISTS tcpa_consent_source TEXT;
