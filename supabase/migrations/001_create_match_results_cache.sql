-- Migration: 001_create_match_results_cache
-- Purpose: Cache of match results fetched from football-data.org API.
--          Updated by the server-side polling job; read by anonymous clients.
-- Author role: db-engineer
-- Date: 2026-06-03

CREATE TABLE IF NOT EXISTS match_results_cache (
  id            INTEGER PRIMARY KEY,          -- football-data.org match ID
  home_team     TEXT NOT NULL,
  away_team     TEXT NOT NULL,
  home_score    INTEGER,
  away_score    INTEGER,
  status        TEXT NOT NULL,                -- SCHEDULED | IN_PLAY | FINISHED | etc.
  stage         TEXT,
  match_group   TEXT,                         -- GROUP_STAGE group letter; NULL for knockout rounds
  utc_date      TIMESTAMPTZ,
  goals         JSONB DEFAULT '[]'::JSONB,    -- array of {scorer, minute, team}
  live_minute   INTEGER,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_results_status   ON match_results_cache(status);
CREATE INDEX IF NOT EXISTS idx_match_results_utc_date ON match_results_cache(utc_date);
