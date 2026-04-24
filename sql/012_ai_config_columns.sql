-- ============================================================
-- Migration 012: Extend property_ai_configs with rich context fields
-- Run in Supabase SQL Editor after 003_ai_config.sql
-- ============================================================

alter table property_ai_configs
  add column if not exists unit_mix           jsonb    not null default '[]'::jsonb,
  add column if not exists amenities          text[]   not null default '{}',
  add column if not exists pet_policy         text,
  add column if not exists parking_info       text,
  add column if not exists laundry_info       text,
  add column if not exists utilities_included text,
  add column if not exists unit_mix_synced_at timestamptz;
