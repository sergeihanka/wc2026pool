import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import { Flipper, Flipped } from 'react-flip-toolkit'
import { poolService } from '@/services/PoolService'
import { teamFlag } from '@/lib/flags'
import type { LeaderboardRow, Match } from '@/types'

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
}

function getRankColor(rank: number): string {
  return RANK_COLORS[rank] ?? 'text.secondary'
}

function formatGD(gd: number): string {
  if (gd > 0) return `+${gd}`
  return String(gd)
}

function buildPlayedTeams(matches: Match[]): Set<string> {
  const played = new Set<string>()
  for (const m of matches) {
    if (m.status !== 'SCHEDULED' && m.status !== 'TIMED' && m.status !== 'POSTPONED' && m.status !== 'CANCELLED') {
      if (m.homeTeam.shortCode) played.add(m.homeTeam.shortCode)
      if (m.awayTeam.shortCode) played.add(m.awayTeam.shortCode)
    }
  }
  return played
}

function PointsTrend({ points }: { points: number }) {
  const maxDots = 5
  const filled = Math.min(points, maxDots)
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      {Array.from({ length: maxDots }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: i < filled ? 'primary.main' : 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </Box>
  )
}

function RowSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1.5,
        mb: 1,
        gap: 2,
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 2,
      }}
    >
      <Skeleton variant="circular" width={28} height={28} />
      <Skeleton variant="text" width={120} height={24} />
      <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
        <Skeleton variant="text" width={30} height={24} />
        <Skeleton variant="text" width={60} height={24} />
        <Skeleton variant="text" width={30} height={24} />
        <Skeleton variant="text" width={30} height={24} />
      </Box>
    </Paper>
  )
}

interface LeaderboardRowItemProps {
  row: LeaderboardRow
  playedTeams: Set<string>
}

function LeaderboardRowItem({ row, playedTeams }: LeaderboardRowItemProps) {
  const rankColor = getRankColor(row.rank)
  const isTopThree = row.rank <= 3

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: { xs: 1.5, sm: 2 },
        py: 1.5,
        mb: 1,
        gap: { xs: 1, sm: 2 },
        border: '1px solid',
        borderColor: isTopThree ? `${rankColor}33` : 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        background: isTopThree ? `${rankColor}0a` : undefined,
      }}
    >
      <Typography
        variant="body1"
        sx={{
          fontWeight: 700,
          fontFamily: 'Barlow Condensed',
          minWidth: 24,
          textAlign: 'center',
          color: isTopThree ? rankColor : 'text.secondary',
          fontSize: '1.1rem',
        }}
      >
        {row.rank}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          fontFamily: 'Barlow Condensed',
          fontWeight: 600,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.member.displayName}
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {row.member.teams.map((code) => (
          <Chip
            key={code}
            label={teamFlag(code)}
            size="small"
            sx={{
              fontSize: '1rem',
              height: 22,
              bgcolor: playedTeams.has(code) ? 'primary.main' : 'transparent',
              color: playedTeams.has(code) ? '#fff' : 'text.disabled',
              border: '1px solid',
              borderColor: playedTeams.has(code) ? 'primary.main' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          gap: 2,
          alignItems: 'center',
          minWidth: 140,
          justifyContent: 'flex-end',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32, textAlign: 'right' }}>
          {row.won}W/{row.drawn}D/{row.lost}L
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28, textAlign: 'right' }}>
          {formatGD(row.goalDifference)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20, textAlign: 'right' }}>
          {row.goalsFor}
        </Typography>
      </Box>

      <PointsTrend points={row.points} />

      <Typography
        variant="body1"
        sx={{
          fontWeight: 700,
          fontFamily: 'Barlow Condensed',
          minWidth: 28,
          textAlign: 'right',
          fontSize: '1.1rem',
          color: isTopThree ? rankColor : 'text.primary',
        }}
      >
        {row.points}
      </Typography>
    </Paper>
  )
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [playedTeams, setPlayedTeams] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const matches = await poolService.getAllMatches()
      const leaderboard = poolService.computeLeaderboard(matches)
      setRows(leaderboard)
      setPlayedTeams(buildPlayedTeams(matches))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  const flipKey = rows.map((r) => r.member.id).join(',')

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto' }}>
      <Typography
        variant="h5"
        sx={{
          fontFamily: 'Barlow Condensed',
          fontWeight: 700,
          letterSpacing: 1,
          mb: 2,
        }}
      >
        LEADERBOARD
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </>
      ) : (
        <>
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              px: 2,
              mb: 0.5,
              gap: 2,
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 24 }}>#</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>Player</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>Teams</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140, textAlign: 'right' }}>W/D/L · GD · GF</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>Trend</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28, textAlign: 'right' }}>Pts</Typography>
          </Box>

          <Flipper flipKey={flipKey}>
            {rows.map((row) => (
              <Flipped key={row.member.id} flipId={row.member.id}>
                <div>
                  <LeaderboardRowItem row={row} playedTeams={playedTeams} />
                </div>
              </Flipped>
            ))}
          </Flipper>
        </>
      )}
    </Box>
  )
}
