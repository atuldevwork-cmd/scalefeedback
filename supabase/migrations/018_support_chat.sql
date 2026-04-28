-- Support Chat: AI-first chat with human escalation
-- Tables: support_chats, support_messages

CREATE TABLE IF NOT EXISTS support_chats (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name  TEXT,
  user_email TEXT,
  status     TEXT NOT NULL DEFAULT 'bot'
             CHECK (status IN ('bot', 'waiting_human', 'with_human', 'resolved')),
  agent_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id    UUID REFERENCES support_chats(id) ON DELETE CASCADE NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'bot', 'agent')),
  sender_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Keep updated_at current whenever a new message is added
CREATE OR REPLACE FUNCTION touch_support_chat_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_chats SET updated_at = now() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_touch_support_chat
  AFTER INSERT ON support_messages
  FOR EACH ROW EXECUTE FUNCTION touch_support_chat_on_message();

-- RLS: all authenticated users can read/write (team product — every user is trusted)
ALTER TABLE support_chats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_chats_authenticated"
  ON support_chats FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "support_messages_authenticated"
  ON support_messages FOR ALL
  USING (auth.role() = 'authenticated');

-- Enable Supabase Realtime for live message delivery
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_chats;
ALTER TABLE support_messages REPLICA IDENTITY FULL;
ALTER TABLE support_chats    REPLICA IDENTITY FULL;
