-- 011_retry_dedup_hubspot.sql
-- Adds retry logic to follow_up_tasks, lead dedup index, and HubSpot key storage.

-- ── Retry columns on follow_up_tasks ─────────────────────────────────────────
ALTER TABLE follow_up_tasks
  ADD COLUMN IF NOT EXISTS retry_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_at     TIMESTAMPTZ;

-- Index so the cron can quickly pick up retry-eligible tasks
CREATE INDEX IF NOT EXISTS follow_up_tasks_retry_idx
  ON follow_up_tasks (retry_at)
  WHERE status = 'pending' AND retry_count > 0;

-- ── Lead deduplication index ──────────────────────────────────────────────────
-- Prevents the same phone being inserted twice for the same property.
-- If you have existing duplicates, clean them first before adding UNIQUE.
CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_property_unique
  ON leads (phone, property_id)
  WHERE opt_out = false;

-- ── HubSpot integration per operator ─────────────────────────────────────────
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS hubspot_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS hubspot_portal_id     TEXT,
  ADD COLUMN IF NOT EXISTS hubspot_connected_at  TIMESTAMPTZ;

-- ── GDPR deletion log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_deletion_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_id      UUID NOT NULL,          -- original lead id (for audit, no FK)
  property_id  UUID NOT NULL,
  operator_id  UUID NOT NULL,
  requested_by TEXT NOT NULL,          -- email of who requested deletion
  method       TEXT NOT NULL DEFAULT 'gdpr_request',
  metadata     JSONB
);
