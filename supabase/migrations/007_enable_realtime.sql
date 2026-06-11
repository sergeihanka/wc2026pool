-- Enable Supabase Realtime replication for match_results_cache so that
-- connected browsers get instant push updates when the server-side poller writes new data.
ALTER PUBLICATION supabase_realtime ADD TABLE match_results_cache;
