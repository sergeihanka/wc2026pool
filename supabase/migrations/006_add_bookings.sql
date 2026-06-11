-- Add bookings column to store yellow/red card data from the API.
ALTER TABLE match_results_cache
  ADD COLUMN IF NOT EXISTS bookings jsonb NOT NULL DEFAULT '[]';
