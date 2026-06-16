import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { useAuth } from '@/hooks/useAuth'
import { clearAllAndLogout } from '@/lib/cacheUtils'
import { poolService } from '@/services/PoolService'
import { POOL_MEMBERS } from '@/config/pool'
import { teamFlag } from '@/lib/flags'
import { StatusChip, formatStageLabel } from '@/components/MatchCard'
import type { Match, PoolMember, LeaderboardRow } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RANK_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }

function formatGD(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd)
}

function formatMatchDate(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatKickoff(utcDate: string): string {
  return new Date(utcDate).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTeamMatches(teamCode: string, matches: Match[]): Match[] {
  return matches
    .filter(
      (m) => m.homeTeam.shortCode === teamCode || m.awayTeam.shortCode === teamCode,
    )
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
}

function computeTeamRecord(
  teamCode: string,
  matches: Match[],
): { won: number; drawn: number; lost: number; gd: number; gf: number } {
  let won = 0, drawn = 0, lost = 0, gd = 0, gf = 0
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    const isHome = m.homeTeam.shortCode === teamCode
    const isAway = m.awayTeam.shortCode === teamCode
    if (!isHome && !isAway) continue
    const hs = m.homeScore ?? 0
    const as_ = m.awayScore ?? 0
    if (isHome) {
      gf += hs; gd += hs - as_
      if (hs > as_) won++; else if (hs === as_) drawn++; else lost++
    } else {
      gf += as_; gd += as_ - hs
      if (as_ > hs) won++; else if (as_ === hs) drawn++; else lost++
    }
  }
  return { won, drawn, lost, gd, gf }
}

function computePlayerStats(
  teamCode: string,
  matches: Match[],
): { name: string; goals: number }[] {
  const scorers = new Map<string, number>()
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    for (const g of m.goals) {
      const isTeamGoal =
        (g.team === 'home' && m.homeTeam.shortCode === teamCode) ||
        (g.team === 'away' && m.awayTeam.shortCode === teamCode)
      if (isTeamGoal && g.scorer) {
        scorers.set(g.scorer, (scorers.get(g.scorer) ?? 0) + 1)
      }
    }
  }
  return Array.from(scorers.entries())
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatsGrid({
  row,
  member,
}: {
  row: LeaderboardRow | undefined
  member: PoolMember
}) {
  const rankColor = row ? (RANK_COLORS[row.rank] ?? undefined) : undefined

  const stats = row
    ? [
        { label: 'Rank', value: `#${row.rank}` },
        { label: 'Points', value: String(row.points) },
        { label: 'W / D / L', value: `${row.won} / ${row.drawn} / ${row.lost}` },
        { label: 'GD', value: formatGD(row.goalDifference) },
        { label: 'GF', value: String(row.goalsFor) },
        { label: 'GA', value: String(row.goalsAgainst) },
        { label: '🟨 Yellow', value: String(row.yellowCards) },
        { label: '🟥 Red', value: String(row.redCards) },
        { label: 'Played', value: String(row.played) },
      ]
    : []

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: rankColor ? `${rankColor}44` : 'rgba(255,255,255,0.1)',
        background: rankColor ? `${rankColor}09` : undefined,
        borderRadius: 2,
        p: 2,
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Avatar sx={{ bgcolor: member.color, width: 40, height: 40, fontWeight: 700, fontSize: '0.8rem' }}>
          {member.avatarInitials}
        </Avatar>
        <Box>
          <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1.1rem' }}>
            {member.displayName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {member.teams.map((t) => (
              <Typography
                key={t}
                sx={{ fontSize: '1.2rem', lineHeight: 1 }}
              >
                {teamFlag(t)}
              </Typography>
            ))}
          </Box>
        </Box>
        {rankColor && (
          <Typography
            sx={{
              ml: 'auto',
              fontFamily: 'Barlow Condensed',
              fontWeight: 700,
              fontSize: '2rem',
              color: rankColor,
            }}
          >
            #{row?.rank}
          </Typography>
        )}
      </Box>

      {stats.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
          {stats.map((s) => (
            <Box key={s.label} sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700 }}>
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  )
}

function TeamSection({
  teamCode,
  matches,
  member,
}: {
  teamCode: string
  matches: Match[]
  member: PoolMember
}) {
  const navigate = useNavigate()
  const teamMatches = getTeamMatches(teamCode, matches)
  const record = computeTeamRecord(teamCode, matches)
  const playerStats = computePlayerStats(teamCode, matches)
  const finished = teamMatches.filter((m) => m.status === 'FINISHED')
  const upcoming = teamMatches
    .filter((m) => m.status === 'SCHEDULED' || m.status === 'TIMED')
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
  const live = teamMatches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED')

  return (
    <Box sx={{ mb: 3 }}>
      {/* Team header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box
          sx={{
            px: 1.5,
            py: 0.4,
            bgcolor: member.color,
            borderRadius: 1,
            display: 'inline-flex',
          }}
        >
          <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
            {teamFlag(teamCode)} {teamCode}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {record.won}W · {record.drawn}D · {record.lost}L · GD {formatGD(record.gd)} · {record.gf} GF
        </Typography>
      </Box>

      {/* Live matches */}
      {live.map((m) => {
        const isHome = m.homeTeam.shortCode === teamCode
        const opp = isHome ? m.awayTeam.shortCode : m.homeTeam.shortCode
        return (
          <Paper
            key={m.id}
            elevation={0}
            onClick={() => navigate(`/matches/${m.id}`)}
            sx={{
              border: '1px solid',
              borderColor: 'error.main',
              borderRadius: 1.5,
              p: 1.5,
              mb: 1,
              cursor: 'pointer',
              background: 'rgba(211,47,47,0.05)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
              <StatusChip match={m} />
              <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1rem' }}>
                {isHome ? `${teamFlag(teamCode)} ${m.homeScore ?? 0} – ${m.awayScore ?? 0} ${teamFlag(opp)}` : `${teamFlag(opp)} ${m.awayScore ?? 0} – ${m.homeScore ?? 0} ${teamFlag(teamCode)}`}
              </Typography>
              {m.minute != null && (
                <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                  {m.minute}&apos;
                </Typography>
              )}
            </Box>
          </Paper>
        )
      })}

      {/* Upcoming games */}
      {upcoming.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            Upcoming
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
            {upcoming.map((m) => {
              const isHome = m.homeTeam.shortCode === teamCode
              const opp = isHome ? m.awayTeam.shortCode : m.homeTeam.shortCode
              return (
                <Box
                  key={m.id}
                  onClick={() => navigate(`/matches/${m.id}`)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 56 }}>
                    {formatMatchDate(m.utcDate)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 16 }}>
                    {isHome ? 'vs' : '@'}
                  </Typography>
                  <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 600, flex: 1, fontSize: '0.9rem' }}>
                    {teamFlag(opp)}
                  </Typography>
                  <Typography variant="caption" color="primary.main">
                    {formatKickoff(m.utcDate)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {formatStageLabel(m.stage)}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}

      {/* Recent results */}
      {finished.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            Results
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
            {finished.slice(0, 5).map((m) => {
              const isHome = m.homeTeam.shortCode === teamCode
              const opp = isHome ? m.awayTeam.shortCode : m.homeTeam.shortCode
              const hs = m.homeScore ?? 0
              const as_ = m.awayScore ?? 0
              const teamScore = isHome ? hs : as_
              const oppScore = isHome ? as_ : hs
              const result = teamScore > oppScore ? 'W' : teamScore === oppScore ? 'D' : 'L'
              const resultColor = result === 'W' ? '#4caf50' : result === 'D' ? '#ff9800' : '#f44336'

              return (
                <Box
                  key={m.id}
                  onClick={() => navigate(`/matches/${m.id}`)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 56 }}>
                    {formatMatchDate(m.utcDate)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 16 }}>
                    {isHome ? 'vs' : '@'}
                  </Typography>
                  <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 600, flex: 1, fontSize: '0.9rem' }}>
                    {teamFlag(opp)}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Barlow Condensed',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      minWidth: 40,
                      textAlign: 'right',
                    }}
                  >
                    {teamScore} – {oppScore}
                  </Typography>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: 0.5,
                      bgcolor: resultColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>
                      {result}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}

      {/* Player stats (scorers) */}
      {playerStats.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            Top Scorers
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
            {playerStats.map(({ name, goals }) => (
              <Tooltip key={name} title={`${goals} goal${goals > 1 ? 's' : ''}`}>
                <Chip
                  label={`${name.split(' ').pop()} · ${goals}`}
                  size="small"
                  sx={{
                    fontSize: '0.7rem',
                    height: 22,
                    bgcolor: `${member.color}22`,
                    color: 'text.primary',
                    border: `1px solid ${member.color}55`,
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ─── MyPoolPage ───────────────────────────────────────────────────────────────

const POOL_VIEW_KEY = 'wcp_pool_view'

export default function MyPoolPage() {
  const { currentMember, logout } = useAuth()
  const navigate = useNavigate()
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false)
  const [viewMemberId, setViewMemberId] = useState<string>(() => {
    const saved = localStorage.getItem(POOL_VIEW_KEY)
    if (saved && POOL_MEMBERS.some((m) => m.id === saved)) return saved
    return currentMember?.id ?? POOL_MEMBERS[0].id
  })
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<LeaderboardRow[]>([])

  async function handleSwitchUser() {
    setSwitchDialogOpen(false)
    logout()
    await clearAllAndLogout()
    navigate('/login', { replace: true })
  }

  async function load() {
    try {
      const data = await poolService.getAllMatches()
      setMatches(data)
      setRows(poolService.computeLeaderboard(data))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const interval = setInterval(() => void load(), 60_000)
    return () => clearInterval(interval)
  }, [])

  const viewMember = POOL_MEMBERS.find((m) => m.id === viewMemberId) ?? POOL_MEMBERS[0]
  const viewRow = rows.find((r) => r.member.id === viewMemberId)

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={160} />
        <Skeleton variant="rounded" height={200} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2, pb: 8, maxWidth: 720, mx: 'auto' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Member switcher */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
          Viewing
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {POOL_MEMBERS.map((m) => {
            const isActive = m.id === viewMemberId
            const isMe = m.id === currentMember?.id
            return (
              <Chip
                key={m.id}
                avatar={
                  <Avatar sx={{ bgcolor: `${m.color} !important`, fontSize: '0.55rem !important', fontWeight: 700 }}>
                    {m.avatarInitials}
                  </Avatar>
                }
                label={`${m.displayName.split(' ')[0]}${isMe ? ' (me)' : ''}`}
                onClick={() => {
                  localStorage.setItem(POOL_VIEW_KEY, m.id)
                  setViewMemberId(m.id)
                }}
                size="small"
                sx={{
                  fontWeight: isActive ? 700 : 400,
                  bgcolor: isActive ? `${m.color}22` : undefined,
                  border: '1px solid',
                  borderColor: isActive ? m.color : 'rgba(255,255,255,0.15)',
                  color: isActive ? m.color : 'text.secondary',
                }}
              />
            )
          })}
        </Box>
      </Box>

      {/* Stats card */}
      <StatsGrid row={viewRow} member={viewMember} />

      <Divider sx={{ mb: 2.5 }} />

      {/* Teams */}
      <Typography
        variant="overline"
        sx={{ fontSize: '0.7rem', letterSpacing: 1.5, color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1.5 }}
      >
        Teams
      </Typography>

      {viewMember.teams.map((teamCode) => (
        <TeamSection
          key={teamCode}
          teamCode={teamCode}
          matches={matches}
          member={viewMember}
        />
      ))}

      {/* Switch user */}
      {currentMember && (
        <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
          <Button
            size="small"
            variant="text"
            onClick={() => setSwitchDialogOpen(true)}
            sx={{ color: 'text.disabled', fontSize: '0.72rem', textTransform: 'none' }}
          >
            Not {currentMember.displayName.split(' ')[0]}? Switch user
          </Button>
        </Box>
      )}

      <Dialog
        open={switchDialogOpen}
        onClose={() => setSwitchDialogOpen(false)}
      >
        <DialogTitle sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700 }}>
          Switch user?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will sign out and clear all local data. You'll be asked to choose your profile again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSwitchDialogOpen(false)}>Cancel</Button>
          <Button color="error" onClick={() => void handleSwitchUser()}>
            Sign out &amp; clear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
