import { useState, useEffect, useRef } from 'react'
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
import { PollingService } from '@/services/PollingService'
import { StatusChip, formatStageLabel } from '@/components/MatchCard'
import { POOL_MEMBERS } from '@/config/pool'

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
            {isHome && (
              <>
                <SportsIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {goal.scorer ?? 'Unknown'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {goal.minute}&apos;
                </Typography>
              </>
            )}
            {!isHome && (
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
              label={`${member.displayName} · ${memberTeams.join(', ')}`}
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

function MatchDetailSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 2 }} />
      <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
    </Box>
  )
}

export default function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()

  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const lastFetchTimeRef = useRef<Date | null>(null)
  const polling = PollingService.getInstance()

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

  useEffect(() => {
    void fetchMatch()
  }, [matchId])

  useEffect(() => {
    const intervalId = setInterval(() => {
      const current = polling.getLastFetchTime()
      const prev = lastFetchTimeRef.current
      if (current && current !== prev) {
        lastFetchTimeRef.current = current
        void fetchMatch()
      }
    }, 1000)
    return () => clearInterval(intervalId)
  }, [polling, matchId])

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
                {match.homeTeam.shortCode || match.homeTeam.name.slice(0, 3).toUpperCase()}
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
                {match.awayTeam.shortCode || match.awayTeam.name.slice(0, 3).toUpperCase()}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1,
                mb: match.goals.length > 0 ? 2 : 0,
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ flex: 1, textAlign: 'right' }}
              >
                {match.homeTeam.name}
              </Typography>
              <Box sx={{ minWidth: 100 }} />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ flex: 1, textAlign: 'left' }}
              >
                {match.awayTeam.name}
              </Typography>
            </Box>

            {(match.status === 'IN_PLAY' || match.status === 'PAUSED') &&
              match.minute != null && (
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                    {match.minute}&apos;
                  </Typography>
                </Box>
              )}

            {match.goals.length > 0 && (
              <>
                <Divider sx={{ mb: 1 }} />
                <GoalTimeline match={match} />
              </>
            )}
          </Box>

          <PoolMemberIndicator match={match} />
        </>
      )}
    </Box>
  )
}
