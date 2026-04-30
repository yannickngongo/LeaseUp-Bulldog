-- Migration 012: Ad platform integrations
-- Adds Meta Ads + Google Ads columns to operators and campaigns tables,
-- creates Supabase Storage bucket for campaign images,
-- and adds an increment_campaign_leads RPC if not already present.

-- ─── operators: ad platform credentials ──────────────────────────────────────
ALTER TABLE operators ADD COLUMN IF NOT EXISTS meta_access_token     TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS meta_ad_account_id    TEXT;  -- "act_123456789"
ALTER TABLE operators ADD COLUMN IF NOT EXISTS meta_page_id          TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS meta_connected_at     TIMESTAMPTZ;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS google_ads_customer_id    TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS google_ads_refresh_token  TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS google_ads_connected_at   TIMESTAMPTZ;

-- ─── campaigns: launch tracking ──────────────────────────────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS leads_generated      INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_campaign_id     TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_adset_id        TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_ad_id           TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_lead_form_id    TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS google_campaign_id   TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS google_adgroup_id    TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ad_budget_cents      INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ad_duration_days     INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ad_platform          TEXT CHECK (ad_platform IN ('facebook', 'instagram', 'google'));
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS image_url            TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS launched_at          TIMESTAMPTZ;

-- ─── increment_campaign_leads RPC ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_campaign_leads(campaign_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE campaigns SET leads_generated = COALESCE(leads_generated, 0) + 1 WHERE id = campaign_id;
$$;

-- ─── Supabase Storage: campaign-images bucket ────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-images',
  'campaign-images',
  true,
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Allow public reads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Campaign images public read'
  ) THEN
    CREATE POLICY "Campaign images public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'campaign-images');
  END IF;
END $$;

-- Allow authenticated inserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Campaign images authenticated upload'
  ) THEN
    CREATE POLICY "Campaign images authenticated upload"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'campaign-images');
  END IF;
END $$;

-- Allow service role to do anything (for server-side uploads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Campaign images service role all'
  ) THEN
    CREATE POLICY "Campaign images service role all"
      ON storage.objects FOR ALL TO service_role
      USING (bucket_id = 'campaign-images');
  END IF;
END $$;
