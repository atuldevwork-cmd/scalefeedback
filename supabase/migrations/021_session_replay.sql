-- Add session replay events storage to feedback
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS session_events jsonb DEFAULT NULL;
