-- Run this in your Supabase SQL editor: https://app.supabase.com → SQL Editor
-- Adds missing columns to the competitors table.

ALTER TABLE competitors
  ADD COLUMN IF NOT EXISTS concession      TEXT,
  ADD COLUMN IF NOT EXISTS units_available INTEGER,
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS distance_miles  NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS website_url     TEXT,
  ADD COLUMN IF NOT EXISTS property_name   TEXT;
