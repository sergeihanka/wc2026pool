-- verify.sql
-- Purpose: Confirm all three tables exist and RLS is enabled.
--          Run this after applying migrations to validate the schema.
-- Author role: db-engineer
-- Date: 2026-06-03

-- 1. Confirm tables exist in the public schema
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'match_results_cache',
    'push_subscriptions',
    'notification_log'
  )
ORDER BY table_name;

-- 2. Confirm RLS is enabled on all three tables
SELECT relname        AS table_name,
       relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN (
    'match_results_cache',
    'push_subscriptions',
    'notification_log'
  )
ORDER BY relname;

-- 3. List all RLS policies defined for our tables
SELECT schemaname,
       tablename,
       policyname,
       roles,
       cmd,
       qual,
       with_check
FROM pg_policies
WHERE tablename IN (
    'match_results_cache',
    'push_subscriptions',
    'notification_log'
  )
ORDER BY tablename, policyname;

-- 4. Confirm indexes exist on match_results_cache
SELECT indexname,
       indexdef
FROM pg_indexes
WHERE tablename = 'match_results_cache'
ORDER BY indexname;
