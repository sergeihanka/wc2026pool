-- Clear all rows from the match cache so stale/mock data is removed.
-- The polling service will repopulate with live data from the API on next run.
TRUNCATE match_results_cache;
