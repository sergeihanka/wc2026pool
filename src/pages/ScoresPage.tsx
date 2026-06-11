import { useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Divider from '@mui/material/Divider'
import { PollingService } from '@/services/PollingService'
import { useScores } from '@/hooks/useScores'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { MatchCard } from '@/components/MatchCard'
import type { Match, MatchStatus } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LIVE_STATUSES: MatchStatus[] = ['IN_PLAY', 'PAUSED']
const FINISHED_STATUSES: MatchStatus[] = ['FINISHED', 'POSTPONED', 'CANCELLED', 'SUSPENDED']

function getUtcDateString(utcDate: string): string {
  return utcDate.slice(0, 10)
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z')
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function sortMatchesWithinGroup(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const aLive = LIVE_STATUSES.includes(a.status)
    const bLive = LIVE_STATUSES.includes(b.status)
    const aFinished = FINISHED_STATUSES.includes(a.status)
    const bFinished = FINISHED_STATUSES.includes(b.status)

    if (aLive && !bLive) return -1
    if (!aLive && bLive) return 1
    if (!aFinished && bFinished) return -1
    if (aFinished && !bFinished) return 1
    return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  })
}

function groupByDate(matches: Match[]): Map<string, Match[]> {
  const map = new Map<string, Match[]>()
  for (const match of matches) {
    const key = getUtcDateString(match.utcDate)
    const existing = map.get(key) ?? []
    existing.push(match)
    map.set(key, existing)
  }
  return map
}

function formatStaleness(lastUpdated: Date): string {
  const diffMs = Date.now() - lastUpdated.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Updated just now'
  if (diffMin === 1) return 'Updated 1 min ago'
  return `Updated ${diffMin} min ago`
}

// ─── ScoresPage ───────────────────────────────────────────────────────────────

const STALENESS_THRESHOLD_MS = 10 * 60_000 // 10 minutes

function isStalenessWarning(lastUpdated: Date, isOnline: boolean): boolean {
  return isOnline && Date.now() - lastUpdated.getTime() > STALENESS_THRESHOLD_MS
}

export default function ScoresPage() {
  const { matches, loading, error, lastUpdated } = useScores()
  const { isOnline } = useNetworkStatus()
  const polling = PollingService.getInstance()

  useEffect(() => {
    polling.start()
    return () => polling.stop()
  }, [polling])

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={110} sx={{ borderRadius: 3 }} />
        ))}
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    )
  }

  if (matches.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No matches available.</Typography>
      </Box>
    )
  }

  const grouped = groupByDate(matches)
  const sortedDates = Array.from(grouped.keys()).sort()

  const stalenessColor =
    lastUpdated && isStalenessWarning(lastUpdated, isOnline)
      ? 'warning.main'
      : 'text.secondary'

  return (
    <Box sx={{ pb: 8 }}>
      {/* Offline banner */}
      {!isOnline && (
        <Alert severity="warning" sx={{ mx: 2, mt: 1 }}>
          You're offline — showing cached data
        </Alert>
      )}

      {/* Staleness indicator */}
      <Box sx={{ px: 2, py: 1, textAlign: 'right' }}>
        <Typography variant="caption" color={stalenessColor}>
          {lastUpdated ? formatStaleness(lastUpdated) : 'Updating…'}
        </Typography>
      </Box>

      {sortedDates.map((dateStr) => {
        const dayMatches = sortMatchesWithinGroup(grouped.get(dateStr)!)
        return (
          <Box key={dateStr}>
            <Box sx={{ px: 2, pt: 2, pb: 0.5 }}>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                {formatDateHeader(dateStr)}
              </Typography>
              <Divider sx={{ mt: 0.5 }} />
            </Box>
            <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 1.5, py: 1.5 }}>
              {dayMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
