-- Add missing columns to property_ai_configs
ALTER TABLE property_ai_configs
  ADD COLUMN IF NOT EXISTS amenities            TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pet_policy           TEXT,
  ADD COLUMN IF NOT EXISTS parking_info         TEXT,
  ADD COLUMN IF NOT EXISTS laundry_info         TEXT,
  ADD COLUMN IF NOT EXISTS utilities_included   TEXT,
  ADD COLUMN IF NOT EXISTS application_link     TEXT,
  ADD COLUMN IF NOT EXISTS tour_instructions    TEXT,
  ADD COLUMN IF NOT EXISTS office_hours         TEXT,
  ADD COLUMN IF NOT EXISTS pricing_notes        TEXT,
  ADD COLUMN IF NOT EXISTS objection_handling_notes TEXT,
  ADD COLUMN IF NOT EXISTS allowed_messaging    TEXT,
  ADD COLUMN IF NOT EXISTS disallowed_claims    TEXT,
  ADD COLUMN IF NOT EXISTS escalation_triggers  TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approved_faqs        JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS unit_mix             JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS leasing_special_title       TEXT,
  ADD COLUMN IF NOT EXISTS leasing_special_description TEXT;
