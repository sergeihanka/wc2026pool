-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   text        NOT NULL,
  content     text        NOT NULL CHECK (char_length(content) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can read all messages
CREATE POLICY "chat_read_all"
  ON chat_messages FOR SELECT
  USING (true);

-- Anyone (anon) can insert — member_id is self-declared (matches our local-auth model)
CREATE POLICY "chat_insert"
  ON chat_messages FOR INSERT
  WITH CHECK (true);

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
