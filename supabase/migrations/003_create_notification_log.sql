-- Migration: 003_create_notification_log
-- Purpose: Append-only log of push notifications dispatched by the server.
--          Used for client-side deduplication (anon SELECT) and server-side
--          idempotency (UNIQUE constraint on match_id + type).
--          All writes are via service role only.
-- Author role: db-engineer
-- Date: 2026-06-03

CREATE TABLE IF NOT EXISTS notification_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    INTEGER     NOT NULL,
  type        TEXT        NOT NULL,   -- 'kickoff' or 'goal:{minute}:{scorer}'
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  payload     JSONB,
  UNIQUE (match_id, type)             -- deduplication constraint prevents duplicate notifications
);
