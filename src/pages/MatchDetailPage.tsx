import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SportsIcon from '@mui/icons-material/Sports'
import type { Match } from '@/types'
import { poolService } from '@/services/PoolService'
import { supabase } from '@/lib/supabase'
import { teamFlag } from '@/lib/flags'
import { StatusChip, formatStageLabel } from '@/components/MatchCard'
import { POOL_MEMBERS } from '@/config/pool'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKickoff(utcDate: string): string {
  return new Date(utcDate).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── GoalTimeline ─────────────────────────────────────────────────────────────

function GoalTimeline({ match }: { match: Match }) {
  if (!match.goals || match.goals.length === 0) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No goals yet
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ mt: 2 }}>
      {match.goals.map((goal, index) => {
        const isHome = goal.team === 'home'
        return (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isHome ? 'flex-start' : 'flex-end',
              mb: 1,
              gap: 1,
            }}
          >
            {isHome ? (
              <>
                <SportsIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {goal.scorer ?? 'Unknown'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {goal.minute}&apos;
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary">
                  {goal.minute}&apos;
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {goal.scorer ?? 'Unknown'}
                </Typography>
                <SportsIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
              </>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

// ─── BookingsSection ──────────────────────────────────────────────────────────

function BookingsSection({ match }: { match: Match }) {
  const bookings = match.bookings ?? []
  if (bookings.length === 0) return null

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
        Cards
      </Typography>
      {bookings.map((b, i) => {
        const isHome = b.team === 'home'
        const cardColor = b.card === 'YELLOW' ? '#FFD700' : '#f44336'
        return (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isHome ? 'flex-start' : 'flex-end',
              mb: 0.75,
              gap: 1,
            }}
          >
            {isHome ? (
              <>
                <Box sx={{ width: 10, height: 14, bgcolor: cardColor, borderRadius: 0.5, flexShrink: 0 }} />
                <Typography variant="body2">{b.player ?? 'Unknown'}</Typography>
                <Typography variant="caption" color="text.secondary">{b.minute}&apos;</Typography>
              </>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary">{b.minute}&apos;</Typography>
                <Typography variant="body2">{b.player ?? 'Unknown'}</Typography>
                <Box sx={{ width: 10, height: 14, bgcolor: cardColor, borderRadius: 0.5, flexShrink: 0 }} />
              </>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

// ─── PoolMemberIndicator ──────────────────────────────────────────────────────

function PoolMemberIndicator({ match }: { match: Match }) {
  const homeCode = match.homeTeam.shortCode
  const awayCode = match.awayTeam.shortCode

  const members = POOL_MEMBERS.filter(
    (m) => m.teams.includes(homeCode) || m.teams.includes(awayCode),
  )

  if (members.length === 0) return null

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Pool members with a stake
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {members.map((member) => {
          const memberTeams = member.teams.filter(
            (t) => t === homeCode || t === awayCode,
          )
          return (
            <Chip
              key={member.id}
              avatar={
                <Avatar sx={{ bgcolor: 'primary.dark', fontSize: 11 }}>
                  {member.avatarInitials}
                </Avatar>
              }
              label={`${member.displayName} · ${memberTeams.map(t => teamFlag(t)).join(' ')}`}
              size="small"
              variant="outlined"
              sx={{ borderColor: 'divider' }}
            />
          )
        })}
      </Box>
    </Box>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MatchDetailSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 2 }} />
      <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
    </Box>
  )
}

// ─── MatchDetailPage ──────────────────────────────────────────────────────────

export default function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()

  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchMatch() {
    if (!matchId) return
    const id = Number(matchId)
    if (Number.isNaN(id)) {
      setError('Invalid match ID')
      setLoading(false)
      return
    }
    try {
      const data = await poolService.getMatch(id)
      setMatch(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load match')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    void fetchMatch()
  }, [matchId])

  // Supabase Realtime: re-fetch this specific match whenever the server-side
  // poller writes new data — gives instant goal/card/minute updates.
  // 30-second fallback poll in case Realtime is unavailable.
  useEffect(() => {
    if (!matchId) return
    const id = Number(matchId)
    if (Number.isNaN(id)) return

    const channel = supabase
      .channel(`match_detail_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_results_cache',
          filter: `id=eq.${id}`,
        },
        () => { void fetchMatch() },
      )
      .subscribe()

    const fallback = setInterval(() => void fetchMatch(), 30_000)

    return () => {
      void supabase.removeChannel(channel)
      clearInterval(fallback)
    }
  }, [matchId])

  return (
    <Box
      sx={{
        maxWidth: 680,
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: 2,
        width: '100%',
      }}
    >
      <IconButton
        onClick={() => navigate(-1)}
        sx={{ mb: 1, ml: -1 }}
        aria-label="Go back"
      >
        <ArrowBackIcon />
      </IconButton>

      {loading && <MatchDetailSkeleton />}

      {error && !loading && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && match && (
        <>
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              p: { xs: 2, sm: 3 },
            }}
          >
            {/* Stage / group / status */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {formatStageLabel(match.stage)}
                {match.group ? ` · ${match.group}` : ''}
              </Typography>
              <StatusChip match={match} />
            </Box>

            {/* Score row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                mb: 1,
              }}
            >
              <Typography
                variant="h4"
                sx={{ flex: 1, textAlign: 'right', fontWeight: 700 }}
              >
                {teamFlag(match.homeTeam.shortCode || match.homeTeam.name.slice(0, 3).toUpperCase())}
              </Typography>

              <Typography
                variant="h3"
                sx={{ fontWeight: 700, minWidth: 100, textAlign: 'center', letterSpacing: 3 }}
              >
                {match.homeScore !== null && match.awayScore !== null
                  ? `${match.homeScore} – ${match.awayScore}`
                  : '–'}
              </Typography>

              <Typography
                variant="h4"
                sx={{ flex: 1, textAlign: 'left', fontWeight: 700 }}
              >
                {teamFlag(match.awayTeam.shortCode || match.awayTeam.name.slice(0, 3).toUpperCase())}
              </Typography>
            </Box>

            {/* Full team names */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1,
                mb: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1, textAlign: 'right' }}>
                {match.homeTeam.name}
              </Typography>
              <Box sx={{ minWidth: 100 }} />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1, textAlign: 'left' }}>
                {match.awayTeam.name}
              </Typography>
            </Box>

            {/* Live minute */}
            {(match.status === 'IN_PLAY' || match.status === 'PAUSED') && match.minute != null && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                  {match.minute}&apos;
                </Typography>
              </Box>
            )}

            {/* Kickoff time for scheduled matches */}
            {(match.status === 'SCHEDULED' || match.status === 'TIMED') && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {formatKickoff(match.utcDate)}
                </Typography>
              </Box>
            )}

            {/* Goals */}
            {match.goals.length > 0 && (
              <>
                <Divider sx={{ mb: 1 }} />
                <GoalTimeline match={match} />
              </>
            )}

            {/* Cards */}
            {(match.bookings ?? []).length > 0 && (
              <>
                <Divider sx={{ mt: 2, mb: 1 }} />
                <BookingsSection match={match} />
              </>
            )}
          </Box>

          <PoolMemberIndicator match={match} />
        </>
      )}
    </Box>
  )
}
