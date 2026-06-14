import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import { PollingService } from '@/services/PollingService'
import { useScores } from '@/hooks/useScores'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { StatusChip, formatStageLabel } from '@/components/MatchCard'
import { TeamDrawer } from '@/components/TeamDrawer'
import { POOL_MEMBERS } from '@/config/pool'
import { TeamFlag } from '@/components/TeamFlag'
import type { Match, MatchStatus, PoolMember } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LIVE_STATUSES: MatchStatus[] = ['IN_PLAY', 'PAUSED']
const FINISHED_STATUSES: MatchStatus[] = ['FINISHED', 'POSTPONED', 'CANCELLED', 'SUSPENDED']


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

function localDateKey(utcDateStr: string): string {
  const d = new Date(utcDateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function groupByDate(matches: Match[]): Map<string, Match[]> {
  const map = new Map<string, Match[]>()
  for (const match of matches) {
    const key = localDateKey(match.utcDate)
    const existing = map.get(key) ?? []
    existing.push(match)
    map.set(key, existing)
  }
  return map
}

function formatDateHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// ─── ScheduleMatchCard ────────────────────────────────────────────────────────

function InitialsBubble({ member }: { member: PoolMember }) {
  return (
    <Tooltip title={member.displayName}>
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          bgcolor: member.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.42rem',
          fontWeight: 700,
          color: '#fff',
          letterSpacing: -0.3,
          flexShrink: 0,
          cursor: 'default',
        }}
      >
        {member.avatarInitials}
      </Box>
    </Tooltip>
  )
}

function ScheduleMatchCard({ match, onTeamClick }: { match: Match; onTeamClick: (code: string) => void }) {
  const navigate = useNavigate()
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED'
  const hasScore = match.homeScore !== null && match.awayScore !== null
  const homeCode = match.homeTeam.shortCode || match.homeTeam.name.slice(0, 3).toUpperCase()
  const awayCode = match.awayTeam.shortCode || match.awayTeam.name.slice(0, 3).toUpperCase()
  const homeStakers = POOL_MEMBERS.filter((m) => m.teams.includes(match.homeTeam.shortCode))
  const awayStakers = POOL_MEMBERS.filter((m) => m.teams.includes(match.awayTeam.shortCode))

  return (
    <Paper
      elevation={0}
      onClick={() => navigate(`/matches/${match.id}`)}
      sx={{
        border: '1px solid',
        borderColor: isLive ? 'error.main' : 'rgba(255,255,255,0.09)',
        borderRadius: 2,
        p: 1.5,
        cursor: 'pointer',
        background: isLive ? 'rgba(211,47,47,0.05)' : undefined,
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      {/* Stage + status */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
        <Typography variant="caption" color="text.secondary">
          {formatStageLabel(match.stage)}
          {match.group ? ` · ${match.group}` : ''}
        </Typography>
        <StatusChip match={match} />
      </Box>

      {/* Score row — tap flag to open team quick-view */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 1 }}>
        <Box
          sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', p: 0.5, borderRadius: 1, '&:active': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          onClick={(e) => { e.stopPropagation(); onTeamClick(homeCode) }}
        >
          <TeamFlag tla={homeCode} size={32} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, minWidth: 72, textAlign: 'center', letterSpacing: 2 }}>
          {hasScore ? `${match.homeScore} – ${match.awayScore}` : '–'}
        </Typography>
        <Box
          sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', p: 0.5, borderRadius: 1, '&:active': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          onClick={(e) => { e.stopPropagation(); onTeamClick(awayCode) }}
        >
          <TeamFlag tla={awayCode} size={32} />
        </Box>
      </Box>

      {/* Member indicators: home stakers bottom-left, away stakers bottom-right */}
      {(homeStakers.length > 0 || awayStakers.length > 0) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
          <Box sx={{ display: 'flex', gap: 0.4 }}>
            {homeStakers.map((m) => <InitialsBubble key={m.id} member={m} />)}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.4 }}>
            {awayStakers.map((m) => <InitialsBubble key={m.id} member={m} />)}
          </Box>
        </Box>
      )}
    </Paper>
  )
}

// ─── ScoresPage ───────────────────────────────────────────────────────────────

export default function ScoresPage() {
  const { matches, loading, error } = useScores()
  const { isOnline } = useNetworkStatus()
  const polling = PollingService.getInstance()
  const todayRef = useRef<HTMLDivElement>(null)
  const [drawerTeam, setDrawerTeam] = useState<string | null>(null)

  useEffect(() => {
    polling.start()
    return () => polling.stop()
  }, [polling])

  // Scroll to today's date group once data is loaded
  useEffect(() => {
    if (!loading && matches.length > 0 && todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
  }, [loading, matches.length])

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={110} sx={{ borderRadius: 2 }} />
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

  const todayKey = localDateKey(new Date().toISOString())
  const grouped = groupByDate(matches)
  const sortedDates = Array.from(grouped.keys()).sort()

  return (
    <Box sx={{ pb: 8 }}>
      {!isOnline && (
        <Alert severity="warning" sx={{ mx: 2, mt: 1 }}>
          You&apos;re offline — showing cached data
        </Alert>
      )}

      <Box sx={{ px: 2, pt: 1.5 }}>
        <Typography
          variant="h6"
          sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, letterSpacing: 1, mb: 0.5 }}
        >
          FULL SCHEDULE
        </Typography>
      </Box>

      {sortedDates.map((dateStr) => {
        const dayMatches = sortMatchesWithinGroup(grouped.get(dateStr)!)
        const isToday = dateStr === todayKey
        return (
          <Box key={dateStr} ref={isToday ? todayRef : undefined}>
            <Box sx={{ px: 2, pt: 2, pb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{ textTransform: 'uppercase', letterSpacing: 1.5, color: 'text.secondary', fontWeight: 700 }}
              >
                {formatDateHeader(dateStr)}
              </Typography>
              <Divider sx={{ mt: 0.5 }} />
            </Box>
            <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 1.5, py: 1.5 }}>
              {dayMatches.map((match) => (
                <ScheduleMatchCard key={match.id} match={match} onTeamClick={setDrawerTeam} />
              ))}
            </Box>
          </Box>
        )
      })}

      <TeamDrawer teamCode={drawerTeam} matches={matches} onClose={() => setDrawerTeam(null)} />
    </Box>
  )
}
