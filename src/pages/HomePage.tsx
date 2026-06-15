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
import { MemberDrawer } from '@/components/MemberDrawer'
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

function InitialsBubble({ member, onMemberClick }: { member: PoolMember; onMemberClick?: (m: PoolMember) => void }) {
  return (
    <Tooltip title={member.displayName}>
      <Box
        onClick={(e) => { e.stopPropagation(); onMemberClick?.(member) }}
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
          cursor: onMemberClick ? 'pointer' : 'default',
        }}
      >
        {member.avatarInitials}
      </Box>
    </Tooltip>
  )
}

function MemberStakes({ match, onMemberClick }: { match: Match; onMemberClick: (m: PoolMember) => void }) {
  const homeStakers = POOL_MEMBERS.filter((m) => m.teams.includes(match.homeTeam.shortCode))
  const awayStakers = POOL_MEMBERS.filter((m) => m.teams.includes(match.awayTeam.shortCode))
  if (homeStakers.length === 0 && awayStakers.length === 0) return null
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
      <Box sx={{ display: 'flex', gap: 0.4 }}>
        {homeStakers.map((m) => <InitialsBubble key={m.id} member={m} onMemberClick={onMemberClick} />)}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.4 }}>
        {awayStakers.map((m) => <InitialsBubble key={m.id} member={m} onMemberClick={onMemberClick} />)}
      </Box>
    </Box>
  )
}

function LiveMatchCard({ match, onTeamClick, onMemberClick }: { match: Match; onTeamClick: (code: string) => void; onMemberClick: (m: PoolMember) => void }) {
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
        borderRadius: 1.5,
        px: 1.5, py: 1,
        cursor: 'pointer',
        background: isLive ? 'rgba(211,47,47,0.06)' : undefined,
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Home flag */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', p: 0.25, borderRadius: 0.5, '&:active': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          onClick={(e) => { e.stopPropagation(); onTeamClick(homeCode) }}
        >
          <TeamFlag tla={homeCode} size={26} />
        </Box>

        {/* Score / time */}
        <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1.1rem', minWidth: 56, textAlign: 'center', letterSpacing: 1 }}>
          {hasScore ? `${match.homeScore} – ${match.awayScore}` : '–'}
        </Typography>

        {/* Away flag */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', p: 0.25, borderRadius: 0.5, '&:active': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          onClick={(e) => { e.stopPropagation(); onTeamClick(awayCode) }}
        >
          <TeamFlag tla={awayCode} size={26} />
        </Box>

        {/* Stage + status pushed to right */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
          <StatusChip match={match} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
            {formatStageLabel(match.stage)}{match.group ? ` · ${match.group}` : ''}
          </Typography>
        </Box>
      </Box>

      <MemberStakes match={match} onMemberClick={onMemberClick} />
    </Paper>
  )
}

// ─── Standings table ──────────────────────────────────────────────────────────

const STICKY_BG = '#0f2040' // matches theme background.paper
const COL_W = 44
const LEFT_W = 170

function Th({
  label, sortKey, current, dir, onSort, first,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir
  onSort: (k: SortKey) => void; first?: boolean
}) {
  const isActive = current === sortKey
  return (
    <Box
      component="th"
      onClick={() => onSort(sortKey)}
      sx={{
        width: COL_W, minWidth: COL_W,
        textAlign: 'center',
        pb: 0.75, pt: 0.5,
        cursor: 'pointer', userSelect: 'none',
        color: isActive ? 'primary.main' : 'text.secondary',
        fontWeight: isActive ? 700 : 400,
        fontSize: '0.65rem',
        letterSpacing: 0.5,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        borderLeft: first ? '1px solid rgba(255,255,255,0.08)' : undefined,
        whiteSpace: 'nowrap',
        '&:hover': { color: 'text.primary' },
      }}
    >
      {label}{isActive ? (dir === 'desc' ? ' ↓' : ' ↑') : ''}
    </Box>
  )
}

function Td({ value, color, bold, first }: { value: string | number; color?: string; bold?: boolean; first?: boolean }) {
  return (
    <Box
      component="td"
      sx={{
        width: COL_W, minWidth: COL_W,
        textAlign: 'center',
        fontSize: bold ? '1.05rem' : '0.8rem',
        fontWeight: bold ? 700 : 400,
        fontFamily: bold ? 'Barlow Condensed' : 'inherit',
        color: color ?? 'text.secondary',
        py: 1,
        borderLeft: first ? '1px solid rgba(255,255,255,0.08)' : undefined,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {value}
    </Box>
  )
}

// ─── StandingsRow ─────────────────────────────────────────────────────────────

function StandingsRow({ row, onMemberClick }: { row: LeaderboardRow; onMemberClick: (m: PoolMember) => void }) {
  const RANK_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
  const rankColor = RANK_COLORS[row.rank]

  return (
    <Box
      component="tr"
      onClick={() => onMemberClick(row.member)}
      sx={{
        cursor: 'pointer',
        '&:hover .lcell': { bgcolor: '#172a4a !important' },
        '&:active .lcell': { bgcolor: '#1d3357 !important' },
        '&:hover td': { bgcolor: 'rgba(255,255,255,0.025)' },
      }}
    >
      {/* LEFT sticky: rank · flags · name + record */}
      <Box
        component="td"
        className="lcell"
        sx={{
          position: 'sticky', left: 0, zIndex: 1,
          bgcolor: STICKY_BG,
          width: LEFT_W, minWidth: LEFT_W, maxWidth: LEFT_W,
          py: 1, pr: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '4px 0 8px rgba(0,0,0,0.4)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
          {/* Rank */}
          <Typography sx={{
            fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '0.85rem',
            color: rankColor ?? 'text.secondary',
            width: 18, textAlign: 'center', flexShrink: 0,
          }}>
            {row.rank}
          </Typography>

          {/* Name + record */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '0.95rem',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}>
              {row.member.displayName}
            </Typography>
            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.2 }}>
              {row.won}W · {row.drawn}D · {row.lost}L
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Scrollable columns — Pts first, then rest */}
      <Td value={row.points} bold color={rankColor ?? 'text.primary'} first />
      <Td value={row.played} />
      <Td value={row.won} />
      <Td value={row.drawn} />
      <Td value={row.lost} />
      <Td value={formatGD(row.goalDifference)} />
      <Td value={row.goalsFor} />
      <Td value={row.goalsAgainst} />
      <Td value={row.yellowCards} color="rgba(255,210,0,0.85)" />
      <Td value={row.redCards} color="rgba(220,80,80,0.9)" />
    </Box>
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
  const [drawerMember, setDrawerMember] = useState<PoolMember | null>(null)

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
              <LiveMatchCard key={m.id} match={m} onTeamClick={setDrawerTeam} onMemberClick={setDrawerMember} />
            ))}
          </Box>
          {todayMatches.filter((m) => m.status === 'SCHEDULED' || m.status === 'TIMED').length > 0 && (
            <>
              <Typography variant="overline" sx={{ fontSize: '0.7rem', letterSpacing: 1.5, color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}>
                Also Today
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                {sortMatchesForHome(todayMatches.filter((m) => m.status === 'SCHEDULED' || m.status === 'TIMED')).map((m) => (
                  <LiveMatchCard key={m.id} match={m} onTeamClick={setDrawerTeam} onMemberClick={setDrawerMember} />
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
              <LiveMatchCard key={m.id} match={m} onTeamClick={setDrawerTeam} onMemberClick={setDrawerMember} />
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
          <Typography variant="body2" color="text.secondary">Loading standings…</Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ overflowX: 'auto', mx: -2 }}>
            <Box component="table" sx={{ borderCollapse: 'collapse', minWidth: '100%' }}>
              <Box component="thead">
                <Box component="tr">
                  {/* LEFT sticky header */}
                  <Box
                    component="th"
                    sx={{
                      position: 'sticky', left: 0, zIndex: 3,
                      bgcolor: STICKY_BG,
                      width: LEFT_W, minWidth: LEFT_W,
                      pb: 0.75, pt: 0.5, pl: 2, pr: 1,
                      textAlign: 'left',
                      fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600,
                      letterSpacing: 0.8, textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '4px 0 8px rgba(0,0,0,0.4)',
                    }}
                  >
                    Team
                  </Box>
                  <Th label="PTS" sortKey="points"        {...headerProps} first />
                  <Th label="P"   sortKey="played"        {...headerProps} />
                  <Th label="W"   sortKey="won"           {...headerProps} />
                  <Th label="D"   sortKey="drawn"         {...headerProps} />
                  <Th label="L"   sortKey="lost"          {...headerProps} />
                  <Th label="GD"  sortKey="goalDifference" {...headerProps} />
                  <Th label="GF"  sortKey="goalsFor"      {...headerProps} />
                  <Th label="GA"  sortKey="goalsAgainst"  {...headerProps} />
                  <Th label="🟨"  sortKey="yellowCards"   {...headerProps} />
                  <Th label="🟥"  sortKey="redCards"      {...headerProps} />
                </Box>
              </Box>
              <Box component="tbody">
                {rows.map((row) => (
                  <StandingsRow key={row.member.id} row={row} onMemberClick={setDrawerMember} />
                ))}
              </Box>
            </Box>
          </Box>

          {/* Legend */}
          <Box sx={{ mt: 2, px: 2, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Win = 3 pts · Draw = 1 pt · Loss = 0 pts
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Tiebreaker: Goal Difference (GD)
            </Typography>
          </Box>
        </>
      )}

      <TeamDrawer teamCode={drawerTeam} matches={matches} onClose={() => setDrawerTeam(null)} />
      <MemberDrawer member={drawerMember} matches={matches} onClose={() => setDrawerMember(null)} />
    </Box>
  )
}
