-- Migration: 002_create_push_subscriptions
-- Purpose: Stores push notification subscriptions for pool members.
--          Anonymous clients upsert by member_id; no cross-user reads permitted.
--          Service role performs administrative reads/deletes.
-- Author role: db-engineer
-- Date: 2026-06-03

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           TEXT        NOT NULL UNIQUE,  -- pool member identifier e.g. "sergei_hanka"
  onesignal_player_id TEXT        UNIQUE,
  teams               TEXT[],                       -- FIFA country codes e.g. ARRAY['ARG','NED']
  enabled             BOOLEAN     DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
