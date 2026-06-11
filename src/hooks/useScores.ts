import { useState, useEffect, useRef } from 'react'
import type { Match } from '@/types'
import { poolService } from '@/services/PoolService'
import { PollingService } from '@/services/PollingService'

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

  // Poll getLastFetchTime() every second — re-fetch matches whenever the
  // PollingService writes new data to Supabase (lastFetchTime advances).
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

  return { matches, loading, error, lastUpdated }
}
