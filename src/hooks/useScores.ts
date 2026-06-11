import { useState, useEffect, useRef } from 'react'
import type { Match } from '@/types'
import { poolService } from '@/services/PoolService'
import { PollingService } from '@/services/PollingService'

interface UseScoresResult {
  matches: Match[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  isSyncing: boolean
}

export function useScores(): UseScoresResult {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(true)

  const lastFetchTimeRef = useRef<Date | null>(null)
  const polling = PollingService.getInstance()

  async function fetchMatches() {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 10s')), 10_000),
      )
      const data = await Promise.race([poolService.getAllMatches(), timeout])
      setMatches(data)
      setError(null)
      if (data.length > 0) setIsSyncing(false)
    } catch (err) {
      console.error('[useScores] fetchMatches failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load matches')
      setIsSyncing(false)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch on mount
  useEffect(() => {
    void fetchMatches()
  }, [])

  // Poll PollingService.lastFetchTime every second — re-fetch from Supabase
  // whenever the poller writes fresh data.
  useEffect(() => {
    const intervalId = setInterval(() => {
      const current = polling.getLastFetchTime()
      const prev = lastFetchTimeRef.current

      if (current && current !== prev) {
        lastFetchTimeRef.current = current
        setLastUpdated(current)
        void fetchMatches()
      }
    }, 1000)

    return () => clearInterval(intervalId)
  }, [polling])

  // When cache is empty after initial load, retry Supabase every 3 seconds
  // until data arrives (poller is filling it in the background).
  useEffect(() => {
    if (loading || matches.length > 0) return
    const retryId = setInterval(() => void fetchMatches(), 3_000)
    return () => clearInterval(retryId)
  }, [loading, matches.length])

  return { matches, loading, error, lastUpdated, isSyncing }
}
