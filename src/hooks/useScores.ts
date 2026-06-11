import { useState, useEffect, useRef } from 'react'
import type { Match } from '@/types'
import { poolService } from '@/services/PoolService'
import { supabase } from '@/lib/supabase'

interface UseScoresResult {
  matches: Match[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useScores(): UseScoresResult {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Prevent triggering the server-side poller more than once per session.
  const didTriggerPollRef = useRef(false)

  async function fetchMatches() {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 10s')), 10_000),
      )
      const data = await Promise.race([poolService.getAllMatches(), timeout])
      setMatches(data)
      setError(null)
      if (data.length > 0) {
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('[useScores] fetchMatches failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load matches')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch on mount
  useEffect(() => {
    void fetchMatches()
  }, [])

  // Subscribe to Supabase Realtime — re-fetch whenever the server-side poller
  // writes new data to match_results_cache.  All connected browsers get the
  // update instantly; no browser ever calls the football-data.org API.
  useEffect(() => {
    const channel = supabase
      .channel('match_cache_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_results_cache' },
        () => {
          void fetchMatches()
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useScores] Supabase Realtime connected')
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  // Fallback: poll Supabase every 30s in case Realtime is unavailable.
  // This is cheap (just a DB read) and ensures data stays fresh.
  useEffect(() => {
    const id = setInterval(() => void fetchMatches(), 30_000)
    return () => clearInterval(id)
  }, [])

  // When the cache is empty after the initial load, kick the server-side
  // poll-scores function once so it populates Supabase immediately, then retry
  // reading every 3 s until data arrives via Realtime or the fallback poll.
  useEffect(() => {
    if (loading || matches.length > 0) return
    if (!didTriggerPollRef.current) {
      didTriggerPollRef.current = true
      fetch('/.netlify/functions/poll-scores').catch(() => {})
    }
    const id = setInterval(() => void fetchMatches(), 3_000)
    return () => clearInterval(id)
  }, [loading, matches.length])

  return { matches, loading, error, lastUpdated }
}
