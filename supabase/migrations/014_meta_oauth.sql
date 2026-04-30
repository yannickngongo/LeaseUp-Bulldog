-- Migration 014: Meta OAuth flow
-- Adds a column to temporarily store the operator's long-lived USER access token
-- between the OAuth callback and the page-picker finalize step.
-- After finalize stores the page-specific token in meta_access_token, this
-- column is cleared.

ALTER TABLE operators ADD COLUMN IF NOT EXISTS meta_oauth_user_token TEXT;
