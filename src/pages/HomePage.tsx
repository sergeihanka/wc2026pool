import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import { StatusChip, formatStageLabel } from '@/components/MatchCard'
import { PollingService } from '@/services/PollingService'
import { poolService } from '@/services/PoolService'
import { useScores } from '@/hooks/useScores'
import { POOL_MEMBERS } from '@/config/pool'
import type { Match, PoolMember, LeaderboardRow } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
}

function getMatchStakes(match: Match): PoolMember[] {
  return POOL_MEMBERS.filter(
    (m) =>
      m.teams.includes(match.homeTeam.shortCode) ||
      m.teams.includes(match.awayTeam.shortCode),
  )
}

function formatGD(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd)
}

function sortMatchesForHome(matches: Match[]): Match[] {
  const order = (m: Match) => {
    if (m.status === 'IN_PLAY') return 0
    if (m.status === 'PAUSED') return 1
    if (m.status === 'SCHEDULED' || m.status === 'TIMED') return 2
    return 3
  }
  return [...matches].sort((a, b) => {
    const diff = order(a) - order(b)
    if (diff !== 0) return diff
    return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  })
}

function getTodayAndLiveMatches(matches: Match[]): Match[] {
  const todayUtc = new Date().toISOString().slice(0, 10)
  return matches.filter((m) => {
    const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED'
    const isToday = m.utcDate.slice(0, 10) === todayUtc
    const isUpcoming = (m.status === 'SCHEDULED' || m.status === 'TIMED') && isToday
    return isLive || isToday || isUpcoming
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemberStakes({ match }: { match: Match }) {
  const stakes = getMatchStakes(match)
  if (stakes.length === 0) return null
  return (
    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75 }}>
      {stakes.map((m) => (
        <Tooltip key={m.id} title={`${m.displayName} (${m.teams.filter((t) => match.homeTeam.shortCode === t || match.awayTeam.shortCode === t).join(', ')})`}>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              fontSize: '0.55rem',
              fontWeight: 700,
              bgcolor: m.color,
              cursor: 'default',
            }}
          >
            {m.avatarInitials}
          </Avatar>
        </Tooltip>
      ))}
    </Box>
  )
}

function LiveMatchCard({ match }: { match: Match }) {
  const navigate = useNavigate()
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED'
  const hasScore = match.homeScore !== null && match.awayScore !== null
  const homeCode = match.homeTeam.shortCode || match.homeTeam.name.slice(0, 3).toUpperCase()
  const awayCode = match.awayTeam.shortCode || match.awayTeam.name.slice(0, 3).toUpperCase()

  return (
    <Paper
      elevation={0}
      onClick={() => navigate(`/matches/${match.id}`)}
      sx={{
        border: '1px solid',
        borderColor: isLive ? 'error.main' : 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        p: 2,
        cursor: 'pointer',
        background: isLive ? 'rgba(211,47,47,0.06)' : undefined,
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      {/* Stage + status */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {formatStageLabel(match.stage)}
          {match.group ? ` · ${match.group}` : ''}
        </Typography>
        <StatusChip match={match} />
      </Box>

      {/* Score row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 1 }}>
        <Typography variant="h5" sx={{ flex: 1, textAlign: 'right', fontWeight: 700 }}>
          {homeCode}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, minWidth: 80, textAlign: 'center', letterSpacing: 2 }}>
          {hasScore ? `${match.homeScore} – ${match.awayScore}` : '–'}
        </Typography>
        <Typography variant="h5" sx={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>
          {awayCode}
        </Typography>
      </Box>

      {/* Live minute */}
      {isLive && match.minute != null && (
        <Box sx={{ textAlign: 'center', mb: 0.5 }}>
          <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
            {match.minute}&apos;
          </Typography>
        </Box>
      )}

      {/* Pool member stakes */}
      <MemberStakes match={match} />
    </Paper>
  )
}

function StandingsRow({ row, playedTeams }: { row: LeaderboardRow; playedTeams: Set<string> }) {
  const rankColor = RANK_COLORS[row.rank]
  const isTopThree = row.rank <= 3

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1.5,
        py: 1,
        gap: 1,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: isTopThree ? `${rankColor}44` : 'rgba(255,255,255,0.07)',
        background: isTopThree ? `${rankColor}09` : undefined,
        mb: 0.75,
      }}
    >
      <Typography
        sx={{
          fontWeight: 700,
          fontFamily: 'Barlow Condensed',
          minWidth: 22,
          textAlign: 'center',
          fontSize: '1rem',
          color: isTopThree ? rankColor : 'text.secondary',
        }}
      >
        {row.rank}
      </Typography>

      {/* Member color dot */}
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: row.member.color,
          flexShrink: 0,
        }}
      />

      <Typography
        sx={{
          fontFamily: 'Barlow Condensed',
          fontWeight: 600,
          flex: 1,
          fontSize: '0.95rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.member.displayName}
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.4 }}>
        {row.member.teams.map((code) => (
          <Chip
            key={code}
            label={code}
            size="small"
            sx={{
              fontSize: '0.6rem',
              height: 18,
              bgcolor: playedTeams.has(code) ? row.member.color : 'transparent',
              color: playedTeams.has(code) ? '#fff' : 'text.disabled',
              border: '1px solid',
              borderColor: playedTeams.has(code) ? row.member.color : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1.5, minWidth: 120, justifyContent: 'flex-end' }}>
        <Typography variant="caption" color="text.secondary">
          {row.won}W·{row.drawn}D·{row.lost}L
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatGD(row.goalDifference)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.goalsFor}gf
        </Typography>
      </Box>

      <Typography
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
    </Box>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Typography
      variant="overline"
      sx={{
        fontSize: '0.7rem',
        letterSpacing: 1.5,
        color: 'text.secondary',
        fontWeight: 700,
        display: 'block',
        mb: 1,
      }}
    >
      {title}
    </Typography>
  )
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { matches, loading } = useScores()
  const polling = PollingService.getInstance()

  useEffect(() => {
    polling.start()
    return () => polling.stop()
  }, [polling])

  const liveMatches = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED')
  const todayAndLive = sortMatchesForHome(getTodayAndLiveMatches(matches))
  const rows = poolService.computeLeaderboard(matches)

  const playedTeams = new Set<string>()
  for (const m of matches) {
    if (m.status !== 'SCHEDULED' && m.status !== 'TIMED' && m.status !== 'POSTPONED' && m.status !== 'CANCELLED') {
      if (m.homeTeam.shortCode) playedTeams.add(m.homeTeam.shortCode)
      if (m.awayTeam.shortCode) playedTeams.add(m.awayTeam.shortCode)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
        ))}
        <Skeleton variant="rounded" height={200} sx={{ mt: 1, borderRadius: 2 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2, pb: 4, maxWidth: 720, mx: 'auto' }}>
      {/* Live / today section */}
      {liveMatches.length > 0 ? (
        <>
          <SectionHeader title={`🔴 Live Now · ${liveMatches.length} match${liveMatches.length > 1 ? 'es' : ''}`} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            {sortMatchesForHome(liveMatches).map((m) => (
              <LiveMatchCard key={m.id} match={m} />
            ))}
          </Box>
        </>
      ) : todayAndLive.length > 0 ? (
        <>
          <SectionHeader title="Today's Matches" />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            {todayAndLive.map((m) => (
              <LiveMatchCard key={m.id} match={m} />
            ))}
          </Box>
        </>
      ) : (
        <Box sx={{ mb: 3, py: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No matches today — check the Schedule tab for upcoming games
          </Typography>
        </Box>
      )}

      <Divider sx={{ mb: 2.5 }} />

      {/* Pool standings */}
      <SectionHeader title="Pool Standings" />

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Standings will appear once matches are played.
        </Typography>
      ) : (
        <>
          {/* Column headers */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, px: 1.5, mb: 0.5, gap: 1, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 22 }}>#</Typography>
            <Box sx={{ width: 8 }} />
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>Player</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>Teams</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120, textAlign: 'right' }}>W·D·L · GD · GF</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28, textAlign: 'right' }}>Pts</Typography>
          </Box>
          {rows.map((row) => (
            <StandingsRow key={row.member.id} row={row} playedTeams={playedTeams} />
          ))}
        </>
      )}
    </Box>
  )
}
