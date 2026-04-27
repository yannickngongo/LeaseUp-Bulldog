-- Enable Supabase Realtime on conversations so the dashboard updates live.
-- REPLICA IDENTITY FULL ensures the full row is available for all event types.

ALTER TABLE conversations REPLICA IDENTITY FULL;

-- Add to publication (idempotent — safe to run if already added manually)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;
