import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '@/hooks/useAuth'
import { poolService } from '@/services/PoolService'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import type { Match, LeaderboardRow } from '@/types'

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
}

function getRankColor(rank: number): string {
  return RANK_COLORS[rank] ?? '#ffffff'
}

function formatGD(gd: number): string {
  if (gd > 0) return `+${gd}`
  return String(gd)
}

function formatMatchDate(utcDate: string): string {
  const d = new Date(utcDate)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function formatScore(match: Match): string {
  if (match.status === 'SCHEDULED' || match.status === 'TIMED') {
    return new Date(match.utcDate).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })
  }
  if (match.homeScore !== null && match.awayScore !== null) {
    return `${match.homeScore} – ${match.awayScore}`
  }
  return match.status
}

function computeTeamRecord(
  teamName: string,
  matches: Match[],
): { won: number; drawn: number; lost: number; gd: number } {
  let won = 0
  let drawn = 0
  let lost = 0
  let gd = 0

  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    const isHome = m.homeTeam.name === teamName
    const isAway = m.awayTeam.name === teamName
    if (!isHome && !isAway) continue
    const hs = m.homeScore ?? 0
    const as_ = m.awayScore ?? 0
    if (isHome) {
      gd += hs - as_
      if (hs > as_) won++
      else if (hs === as_) drawn++
      else lost++
    } else {
      gd += as_ - hs
      if (as_ > hs) won++
      else if (as_ === hs) drawn++
      else lost++
    }
  }

  return { won, drawn, lost, gd }
}

function getTeamMatches(teamName: string, matches: Match[]): Match[] {
  return matches.filter(
    (m) => m.homeTeam.name === teamName || m.awayTeam.name === teamName,
  )
}

interface StatCardProps {
  row: LeaderboardRow
}

function StatCard({ row }: StatCardProps) {
  const rankColor = getRankColor(row.rank)
  const isTop3 = row.rank <= 3

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography
            variant="h3"
            sx={{
              fontFamily: 'Barlow Condensed',
              fontWeight: 700,
              color: isTop3 ? rankColor : 'text.secondary',
              lineHeight: 1,
              fontSize: '2.5rem',
            }}
          >
            #{row.rank}
          </Typography>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Rank
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, lineHeight: 1 }}
            >
              {row.points} pts
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              W / D / L
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'Barlow Condensed', fontWeight: 600 }}>
              {row.won} / {row.drawn} / {row.lost}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              GD
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'Barlow Condensed', fontWeight: 600 }}>
              {formatGD(row.goalDifference)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              GF
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'Barlow Condensed', fontWeight: 600 }}>
              {row.goalsFor}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

interface TeamSectionProps {
  teamName: string
  matches: Match[]
}

function TeamSection({ teamName, matches }: TeamSectionProps) {
  const teamMatches = getTeamMatches(teamName, matches)
  const record = computeTeamRecord(teamName, matches)

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography
          variant="h6"
          sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, letterSpacing: 0.5 }}
        >
          {teamName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {record.won}W · {record.drawn}D · {record.lost}L · GD {formatGD(record.gd)}
        </Typography>
      </Box>

      {teamMatches.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No matches yet.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {teamMatches.map((m) => {
            const isHome = m.homeTeam.name === teamName
            const opponent = isHome ? m.awayTeam.name : m.homeTeam.name
            const score = formatScore(m)
            const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED'

            return (
              <Box
                key={m.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.03)',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>
                  {formatMatchDate(m.utcDate)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 16 }}>
                  {isHome ? 'vs' : '@'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'Barlow Condensed', fontWeight: 600, flex: 1 }}
                >
                  {opponent}
                </Typography>
                {isLive && (
                  <Chip
                    label="LIVE"
                    size="small"
                    color="error"
                    sx={{ fontSize: '0.6rem', height: 18, mr: 0.5 }}
                  />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Barlow Condensed',
                    fontWeight: 700,
                    minWidth: 48,
                    textAlign: 'right',
                    color: isLive ? 'error.main' : 'text.primary',
                  }}
                >
                  {score}
                </Typography>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}

interface StandingsTableProps {
  rows: LeaderboardRow[]
  currentMemberId: string
}

function StandingsTable({ rows, currentMemberId }: StandingsTableProps) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ color: 'text.secondary', fontFamily: 'Barlow Condensed', py: 0.5 }}>#</TableCell>
          <TableCell sx={{ color: 'text.secondary', fontFamily: 'Barlow Condensed', py: 0.5 }}>Player</TableCell>
          <TableCell sx={{ color: 'text.secondary', fontFamily: 'Barlow Condensed', py: 0.5, display: { xs: 'none', sm: 'table-cell' } }}>W/D/L</TableCell>
          <TableCell sx={{ color: 'text.secondary', fontFamily: 'Barlow Condensed', py: 0.5, display: { xs: 'none', sm: 'table-cell' } }}>GD</TableCell>
          <TableCell align="right" sx={{ color: 'text.secondary', fontFamily: 'Barlow Condensed', py: 0.5 }}>Pts</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const isMe = row.member.id === currentMemberId
          const rankColor = getRankColor(row.rank)
          const isTop3 = row.rank <= 3

          return (
            <TableRow
              key={row.member.id}
              sx={{
                bgcolor: isMe ? 'rgba(0,166,81,0.10)' : undefined,
                '& td': { borderColor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <TableCell
                sx={{
                  fontFamily: 'Barlow Condensed',
                  fontWeight: 700,
                  color: isTop3 ? rankColor : 'text.secondary',
                  py: 0.75,
                }}
              >
                {row.rank}
              </TableCell>
              <TableCell sx={{ py: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Barlow Condensed',
                    fontWeight: isMe ? 700 : 400,
                    color: isMe ? 'primary.main' : 'text.primary',
                  }}
                >
                  {row.member.displayName}
                  {isMe && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      (you)
                    </Typography>
                  )}
                </Typography>
              </TableCell>
              <TableCell sx={{ py: 0.75, display: { xs: 'none', sm: 'table-cell' } }}>
                <Typography variant="caption" color="text.secondary">
                  {row.won}/{row.drawn}/{row.lost}
                </Typography>
              </TableCell>
              <TableCell sx={{ py: 0.75, display: { xs: 'none', sm: 'table-cell' } }}>
                <Typography variant="caption" color="text.secondary">
                  {formatGD(row.goalDifference)}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ py: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Barlow Condensed',
                    fontWeight: 700,
                    color: isTop3 ? rankColor : 'text.primary',
                  }}
                >
                  {row.points}
                </Typography>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

interface NotificationToggleProps {
  memberId: string
}

function NotificationToggle({ memberId }: NotificationToggleProps) {
  const { state, subscribe, unsubscribe } = usePushNotifications(memberId)
  const [actionLoading, setActionLoading] = useState(false)

  const handleSubscribe = async () => {
    setActionLoading(true)
    await subscribe()
    setActionLoading(false)
  }

  const handleUnsubscribe = async () => {
    setActionLoading(true)
    await unsubscribe()
    setActionLoading(false)
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="body1" sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, lineHeight: 1.2 }}>
            🔔 Goal &amp; Match Alerts
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Get notified when your teams score
          </Typography>
        </Box>

        {!state.isSupported ? (
          <Typography variant="caption" color="text.secondary">
            Push notifications not supported on this browser
          </Typography>
        ) : state.isLoading ? (
          <CircularProgress size={24} />
        ) : state.isSubscribed ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="Active" size="small" color="success" />
            <Button
              variant="outlined"
              size="small"
              color="success"
              disabled={actionLoading}
              onClick={() => { void handleUnsubscribe() }}
              startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              Disable notifications
            </Button>
          </Box>
        ) : (
          <Button
            variant="contained"
            size="small"
            disabled={actionLoading}
            onClick={() => { void handleSubscribe() }}
            startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            Enable notifications
          </Button>
        )}
      </Box>
    </Paper>
  )
}

function PageSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto' }}>
      <Skeleton variant="text" width={120} height={40} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={200} height={28} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={130} sx={{ mb: 2, borderRadius: 2 }} />
      <Skeleton variant="rounded" height={180} sx={{ mb: 2, borderRadius: 2 }} />
      <Skeleton variant="rounded" height={180} sx={{ mb: 2, borderRadius: 2 }} />
      <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
    </Box>
  )
}

export default function MyPoolPage() {
  const { currentMember, isLoading: authLoading } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await poolService.getAllMatches()
      setMatches(data)
      setLeaderboard(poolService.computeLeaderboard(data))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const interval = setInterval(() => { void load() }, 60_000)
    return () => clearInterval(interval)
  }, [load])

  if (authLoading) return <PageSkeleton />
  if (!currentMember) return <Navigate to="/login" replace />

  const myRow = leaderboard.find((r) => r.member.id === currentMember.id)

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto', pb: 8 }}>
      <Typography
        variant="h4"
        sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, letterSpacing: 1, mb: 0.5 }}
      >
        MY POOL
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="body1" color="text.secondary">
          {currentMember.displayName}
        </Typography>
        {currentMember.teams.map((code) => (
          <Chip
            key={code}
            label={code}
            size="small"
            sx={{
              bgcolor: 'primary.main',
              color: '#fff',
              fontFamily: 'Barlow Condensed',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        ))}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <PageSkeleton />
      ) : (
        <>
          {myRow && (
            <>
              <Typography
                variant="h6"
                sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, mb: 1, letterSpacing: 0.5 }}
              >
                MY STATS
              </Typography>
              <StatCard row={myRow} />
            </>
          )}

          <NotificationToggle memberId={currentMember.id} />

          <Typography
            variant="h6"
            sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, mb: 1.5, letterSpacing: 0.5 }}
          >
            MY TEAMS
          </Typography>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              {currentMember.teams.map((code, idx) => {
                const teamMatch = matches.find(
                  (m) => m.homeTeam.shortCode === code || m.awayTeam.shortCode === code,
                )
                const teamName = teamMatch
                  ? teamMatch.homeTeam.shortCode === code
                    ? teamMatch.homeTeam.name
                    : teamMatch.awayTeam.name
                  : code

                return (
                  <Box key={code}>
                    {idx > 0 && <Divider sx={{ my: 2 }} />}
                    <TeamSection teamName={teamName} matches={matches} />
                  </Box>
                )
              })}
            </CardContent>
          </Card>

          <Typography
            variant="h6"
            sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, mb: 1, letterSpacing: 0.5 }}
          >
            ALL MEMBERS
          </Typography>

          <Paper
            elevation={0}
            sx={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <StandingsTable rows={leaderboard} currentMemberId={currentMember.id} />
          </Paper>
        </>
      )}
    </Box>
  )
}
