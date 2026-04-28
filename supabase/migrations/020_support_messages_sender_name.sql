-- Add sender_name to support_messages so realtime events carry the display name
-- without requiring a join. Populated at insert time for agent/bot messages.
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS sender_name text;
