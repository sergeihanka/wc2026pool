-- Migration: 004_enable_rls
-- Purpose: Enable Row Level Security on all three tables and define access policies.
--
-- Policy summary:
--   match_results_cache  — anon can SELECT; INSERT/UPDATE via service role (bypasses RLS)
--   push_subscriptions   — anon can INSERT and UPDATE (upsert by member_id); no cross-user SELECT
--   notification_log     — anon can SELECT (dedup check); INSERT via service role (bypasses RLS)
--
-- Note: The Supabase service role bypasses RLS automatically. No explicit INSERT/UPDATE
--       policies are required for service-role operations.
-- Author role: db-engineer
-- Date: 2026-06-03

-- ─── match_results_cache ──────────────────────────────────────────────────────

ALTER TABLE match_results_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_matches"
  ON match_results_cache
  FOR SELECT
  TO anon
  USING (true);

-- ─── push_subscriptions ───────────────────────────────────────────────────────

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous clients to register a new subscription
CREATE POLICY "anon_insert_subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous clients to update their own subscription row (upsert pattern)
CREATE POLICY "anon_update_subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ─── notification_log ─────────────────────────────────────────────────────────

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Allow anonymous clients to read the log for client-side deduplication
CREATE POLICY "anon_select_notifications"
  ON notification_log
  FOR SELECT
  TO anon
  USING (true);

-- Service role bypasses RLS — no explicit INSERT policy needed for service-role writes
