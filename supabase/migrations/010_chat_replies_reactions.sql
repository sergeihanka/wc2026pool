-- Chat replies: optional reference to a parent message
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES chat_messages(id) ON DELETE SET NULL;

-- Emoji reactions (one row per member+message+emoji, unique)
CREATE TABLE IF NOT EXISTS chat_reactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  member_id    text NOT NULL,
  emoji        text NOT NULL CHECK (char_length(emoji) <= 8),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, member_id, emoji)
);
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_read_all"    ON chat_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert_own"  ON chat_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "reactions_delete_own"  ON chat_reactions FOR DELETE USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
