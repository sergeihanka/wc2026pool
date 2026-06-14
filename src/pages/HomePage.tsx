import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import { StatusChip, formatStageLabel } from '@/components/MatchCard'
import { TeamDrawer } from '@/components/TeamDrawer'
import { PollingService } from '@/services/PollingService'
import { poolService } from '@/services/PoolService'
import { useScores } from '@/hooks/useScores'
import { POOL_MEMBERS } from '@/config/pool'
import { TeamFlag } from '@/components/TeamFlag'
import type { Match, PoolMember, LeaderboardRow } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'points' | 'played' | 'won' | 'drawn' | 'lost' | 'goalsFor' | 'goalsAgainst' | 'goalDifference' | 'yellowCards' | 'redCards'
type SortDir = 'asc' | 'desc'

// ─── Helpers ──────────────────────────────────────────────────────────────────


function formatGD(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd)
}

function sortRows(rows: LeaderboardRow[], key: SortKey, dir: SortDir): LeaderboardRow[] {
  return [...rows].sort((a, b) => {
    const diff = (a[key] as number) - (b[key] as number)
    return dir === 'desc' ? -diff : diff
  })
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

function localDateKey(utcDateStr: string): string {
  const d = new Date(utcDateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTodayAndLiveMatches(matches: Match[]): Match[] {
  const todayLocal = localDateKey(new Date().toISOString())
  return matches.filter((m) => {
    const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED'
    const isToday = localDateKey(m.utcDate) === todayLocal
    return isLive || isToday
  })
}

function formatLastUpdated(d: Date | null): string {
  if (!d) return ''
  const diffMs = Date.now() - d.getTime()
  const diffS = Math.floor(diffMs / 1000)
  if (diffS < 10) return 'just now'
  if (diffS < 60) return `${diffS}s ago`
  return `${Math.floor(diffS / 60)}m ago`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function MemberStakes({ match }: { match: Match }) {
  const homeStakers = POOL_MEMBERS.filter((m) => m.teams.includes(match.homeTeam.shortCode))
  const awayStakers = POOL_MEMBERS.filter((m) => m.teams.includes(match.awayTeam.shortCode))
  if (homeStakers.length === 0 && awayStakers.length === 0) return null
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
      <Box sx={{ display: 'flex', gap: 0.4 }}>
        {homeStakers.map((m) => <InitialsBubble key={m.id} member={m} />)}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.4 }}>
        {awayStakers.map((m) => <InitialsBubble key={m.id} member={m} />)}
      </Box>
    </Box>
  )
}

function LiveMatchCard({ match, onTeamClick }: { match: Match; onTeamClick: (code: string) => void }) {
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {formatStageLabel(match.stage)}
          {match.group ? ` · ${match.group}` : ''}
        </Typography>
        <StatusChip match={match} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 1 }}>
        <Box
          sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', p: 0.5, borderRadius: 1, '&:active': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          onClick={(e) => { e.stopPropagation(); onTeamClick(homeCode) }}
        >
          <TeamFlag tla={homeCode} size={36} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, minWidth: 80, textAlign: 'center', letterSpacing: 2 }}>
          {hasScore ? `${match.homeScore} – ${match.awayScore}` : '–'}
        </Typography>
        <Box
          sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', p: 0.5, borderRadius: 1, '&:active': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          onClick={(e) => { e.stopPropagation(); onTeamClick(awayCode) }}
        >
          <TeamFlag tla={awayCode} size={36} />
        </Box>
      </Box>

      <MemberStakes match={match} />
    </Paper>
  )
}

// ─── SortableHeader ───────────────────────────────────────────────────────────

function SortableHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = 'right',
  minWidth,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
  align?: 'left' | 'right' | 'center'
  minWidth?: number
}) {
  const isActive = current === sortKey
  return (
    <Typography
      variant="caption"
      onClick={() => onSort(sortKey)}
      sx={{
        color: isActive ? 'primary.main' : 'text.secondary',
        fontWeight: isActive ? 700 : 400,
        cursor: 'pointer',
        userSelect: 'none',
        textAlign: align,
        minWidth,
        display: 'inline-block',
        '&:hover': { color: 'text.primary' },
      }}
    >
      {label}{isActive ? (dir === 'desc' ? ' ↓' : ' ↑') : ''}
    </Typography>
  )
}

// ─── StandingsRow ─────────────────────────────────────────────────────────────

function StandingsRow({ row, playedTeams }: { row: LeaderboardRow; playedTeams: Set<string> }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1.5,
        py: 1,
        gap: 1,
        borderRadius: 1.5,
        border: '1px solid rgba(255,255,255,0.07)',
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
          color: 'text.secondary',
        }}
      >
        {row.rank}
      </Typography>

      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.member.color, flexShrink: 0 }} />

      <Typography
        sx={{
          fontFamily: 'Barlow Condensed',
          fontWeight: 600,
          flex: 1,
          fontSize: '0.95rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 80,
        }}
      >
        {row.member.displayName}
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center' }}>
        {row.member.teams.map((code) => (
          <Box key={code} sx={{ opacity: playedTeams.has(code) ? 1 : 0.5 }}>
            <TeamFlag tla={code} size={20} />
          </Box>
        ))}
      </Box>

      {/* Stats columns — hidden on mobile, shown on sm+ */}
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1.5, alignItems: 'center', justifyContent: 'flex-end' }}>
        <StatCell value={row.played} width={22} />
        <StatCell value={row.won} width={22} />
        <StatCell value={row.drawn} width={22} />
        <StatCell value={row.lost} width={22} />
        <StatCell value={formatGD(row.goalDifference)} width={32} />
        <StatCell value={row.goalsFor} width={22} />
        <StatCell value={row.goalsAgainst} width={22} />
        <StatCell value={row.yellowCards} width={22} color="rgba(255,210,0,0.7)" />
        <StatCell value={row.redCards} width={22} color="rgba(220,80,80,0.8)" />
      </Box>

      {/* Mobile: just W/D/L */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          {row.won}W·{row.drawn}D·{row.lost}L
        </Typography>
      </Box>

      <Typography
        sx={{
          fontWeight: 700,
          fontFamily: 'Barlow Condensed',
          minWidth: 28,
          textAlign: 'right',
          fontSize: '1.1rem',
        }}
      >
        {row.points}
      </Typography>
    </Box>
  )
}

function StatCell({ value, width, color }: { value: string | number; width: number; color?: string }) {
  return (
    <Typography
      variant="caption"
      sx={{ minWidth: width, textAlign: 'right', color: color ?? 'text.secondary' }}
    >
      {value}
    </Typography>
  )
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { matches, loading, lastUpdated } = useScores()
  const polling = PollingService.getInstance()

  const [sortKey, setSortKey] = useState<SortKey>('points')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [, setTick] = useState(0)
  const [drawerTeam, setDrawerTeam] = useState<string | null>(null)

  useEffect(() => {
    polling.start()
    return () => polling.stop()
  }, [polling])

  // Tick every 10s to refresh "last updated X ago" display
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const liveMatches = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED')
  const todayMatches = getTodayAndLiveMatches(matches)

  const baseRows = poolService.computeLeaderboard(matches)
  const rows = sortKey === 'points'
    ? baseRows  // keep default sort (includes tiebreakers) when sorting by points
    : sortRows(baseRows, sortKey, sortDir)

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

  const headerProps = { current: sortKey, dir: sortDir, onSort: handleSort }

  return (
    <Box sx={{ p: 2, pb: 4, maxWidth: 720, mx: 'auto' }}>
      {/* Live / today section */}
      {liveMatches.length > 0 ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', animation: 'livePulse 1.5s ease-in-out infinite' }} />
            <Typography variant="overline" sx={{ fontSize: '0.7rem', letterSpacing: 1.5, color: 'error.main', fontWeight: 700 }}>
              Live Now · {liveMatches.length} match{liveMatches.length > 1 ? 'es' : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            {sortMatchesForHome(liveMatches).map((m) => (
              <LiveMatchCard key={m.id} match={m} onTeamClick={setDrawerTeam} />
            ))}
          </Box>
          {todayMatches.filter((m) => m.status === 'SCHEDULED' || m.status === 'TIMED').length > 0 && (
            <>
              <Typography variant="overline" sx={{ fontSize: '0.7rem', letterSpacing: 1.5, color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}>
                Also Today
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                {sortMatchesForHome(todayMatches.filter((m) => m.status === 'SCHEDULED' || m.status === 'TIMED')).map((m) => (
                  <LiveMatchCard key={m.id} match={m} onTeamClick={setDrawerTeam} />
                ))}
              </Box>
            </>
          )}
        </>
      ) : todayMatches.length > 0 ? (
        <>
          <Typography variant="overline" sx={{ fontSize: '0.7rem', letterSpacing: 1.5, color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}>
            Today&apos;s Matches
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            {sortMatchesForHome(todayMatches).map((m) => (
              <LiveMatchCard key={m.id} match={m} onTeamClick={setDrawerTeam} />
            ))}
          </Box>
        </>
      ) : matches.length === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, py: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading tournament data…
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 3, py: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No matches today — check the Schedule tab for upcoming games
          </Typography>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Pool standings */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="overline" sx={{ fontSize: '0.7rem', letterSpacing: 1.5, color: 'text.secondary', fontWeight: 700 }}>
          Pool Standings
        </Typography>
        {lastUpdated && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            Updated {formatLastUpdated(lastUpdated)}
          </Typography>
        )}
      </Box>

      {rows.length === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Loading standings…
          </Typography>
        </Box>
      ) : (
        <>
          {/* Column headers (desktop only) */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, px: 1.5, mb: 0.5, gap: 1, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 22 }}>#</Typography>
            <Box sx={{ width: 8 }} />
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 80 }}>Player</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>Teams</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <SortableHeader label="P" sortKey="played" {...headerProps} minWidth={22} />
              <SortableHeader label="W" sortKey="won" {...headerProps} minWidth={22} />
              <SortableHeader label="D" sortKey="drawn" {...headerProps} minWidth={22} />
              <SortableHeader label="L" sortKey="lost" {...headerProps} minWidth={22} />
              <SortableHeader label="GD" sortKey="goalDifference" {...headerProps} minWidth={32} />
              <SortableHeader label="GF" sortKey="goalsFor" {...headerProps} minWidth={22} />
              <SortableHeader label="GA" sortKey="goalsAgainst" {...headerProps} minWidth={22} />
              <SortableHeader label="🟨" sortKey="yellowCards" {...headerProps} minWidth={22} />
              <SortableHeader label="🟥" sortKey="redCards" {...headerProps} minWidth={22} />
            </Box>
            <SortableHeader label="Pts" sortKey="points" {...headerProps} minWidth={28} />
          </Box>

          {rows.map((row) => (
            <StandingsRow key={row.member.id} row={row} playedTeams={playedTeams} />
          ))}
        </>
      )}

      <TeamDrawer teamCode={drawerTeam} matches={matches} onClose={() => setDrawerTeam(null)} />
    </Box>
  )
}
