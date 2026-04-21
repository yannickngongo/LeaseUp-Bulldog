-- Run this in your Supabase SQL editor: https://app.supabase.com → SQL Editor

CREATE TABLE IF NOT EXISTS competitors (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   UUID        NOT NULL REFERENCES operators(id)  ON DELETE CASCADE,
  property_id   UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  address       TEXT,
  zip_code      TEXT,
  city          TEXT        NOT NULL DEFAULT '',
  state         TEXT        NOT NULL DEFAULT '',
  their_low     INTEGER     NOT NULL,
  their_high    INTEGER     NOT NULL,
  threat_level  TEXT        NOT NULL DEFAULT 'medium' CHECK (threat_level IN ('high','medium','low')),
  key_amenities TEXT[]      NOT NULL DEFAULT '{}',
  last_synced   TIMESTAMPTZ,
  alert         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS competitors_operator_id_idx ON competitors(operator_id);
CREATE INDEX IF NOT EXISTS competitors_property_id_idx ON competitors(property_id);
