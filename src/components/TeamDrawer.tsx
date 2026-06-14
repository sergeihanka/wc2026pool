import { useNavigate } from 'react-router-dom'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { TeamFlag } from '@/components/TeamFlag'
import { StatusChip } from '@/components/MatchCard'
import { POOL_MEMBERS } from '@/config/pool'
import type { Match } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGD(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd)
}

function formatShortDate(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatKickoff(utcDate: string): string {
  return new Date(utcDate).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
}

function getTeamMatches(teamCode: string, matches: Match[]) {
  return matches
    .filter((m) => m.homeTeam.shortCode === teamCode || m.awayTeam.shortCode === teamCode)
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
}

function computeRecord(teamCode: string, matches: Match[]) {
  let won = 0, drawn = 0, lost = 0, gd = 0, gf = 0
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    const isHome = m.homeTeam.shortCode === teamCode
    const isAway = m.awayTeam.shortCode === teamCode
    if (!isHome && !isAway) continue
    const hs = m.homeScore ?? 0, as_ = m.awayScore ?? 0
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

function getTopScorers(teamCode: string, matches: Match[]) {
  const map = new Map<string, number>()
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    for (const g of m.goals) {
      const isTeam = (g.team === 'home' && m.homeTeam.shortCode === teamCode) ||
                     (g.team === 'away' && m.awayTeam.shortCode === teamCode)
      if (isTeam && g.scorer) map.set(g.scorer, (map.get(g.scorer) ?? 0) + 1)
    }
  }
  return Array.from(map.entries()).map(([name, goals]) => ({ name, goals })).sort((a, b) => b.goals - a.goals)
}

// ─── TeamDrawer ───────────────────────────────────────────────────────────────

interface Props {
  teamCode: string | null
  matches: Match[]
  onClose: () => void
}

export function TeamDrawer({ teamCode, matches, onClose }: Props) {
  const navigate = useNavigate()
  const open = !!teamCode

  const owner = teamCode ? POOL_MEMBERS.find((m) => m.teams.includes(teamCode)) : null
  const teamMatches = teamCode ? getTeamMatches(teamCode, matches) : []
  const record = teamCode ? computeRecord(teamCode, matches) : null
  const scorers = teamCode ? getTopScorers(teamCode, matches) : []

  const live = teamMatches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED')
  const upcoming = teamMatches.filter((m) => m.status === 'SCHEDULED' || m.status === 'TIMED')
  const finished = teamMatches.filter((m) => m.status === 'FINISHED').slice(-3).reverse()

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{ paper: {
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '85vh',
          bgcolor: 'background.paper',
        },
      } }}
    >
      {/* Drag handle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 0.5 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
      </Box>

      <Box sx={{ px: 2, pb: 4, overflowY: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
          <TeamFlag tla={teamCode ?? ''} size={40} />
          <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1.4rem', flex: 1 }}>
            {teamCode}
          </Typography>
          {owner && (
            <Avatar sx={{ bgcolor: owner.color, width: 28, height: 28, fontSize: '0.55rem', fontWeight: 700 }}>
              {owner.avatarInitials}
            </Avatar>
          )}
          <IconButton size="small" onClick={onClose} sx={{ ml: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Record */}
        {record && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2, px: 0.5 }}>
            {[
              { label: 'W', value: record.won },
              { label: 'D', value: record.drawn },
              { label: 'L', value: record.lost },
              { label: 'GD', value: formatGD(record.gd) },
              { label: 'GF', value: record.gf },
            ].map((s) => (
              <Box key={s.label} sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1.2rem', lineHeight: 1 }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Box>
            ))}
          </Box>
        )}

        <Divider sx={{ mb: 1.5 }} />

        {/* Live */}
        {live.length > 0 && (
          <>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'error.main', display: 'block', mb: 0.75 }}>
              Live Now
            </Typography>
            {live.map((m) => {
              const isHome = m.homeTeam.shortCode === teamCode
              const opp = isHome ? m.awayTeam.shortCode : m.homeTeam.shortCode
              const score = isHome ? `${m.homeScore ?? 0}–${m.awayScore ?? 0}` : `${m.awayScore ?? 0}–${m.homeScore ?? 0}`
              return (
                <Box key={m.id} onClick={() => { navigate(`/matches/${m.id}`); onClose() }}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, px: 1, borderRadius: 1.5, bgcolor: 'rgba(211,47,47,0.07)', border: '1px solid', borderColor: 'error.main', mb: 1, cursor: 'pointer' }}>
                  <StatusChip match={m} />
                  <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, flex: 1 }}>
                    {isHome ? `${teamCode} ${score} ${opp}` : `${opp} ${score} ${teamCode}`}
                  </Typography>
                </Box>
              )
            })}
            <Divider sx={{ mb: 1.5 }} />
          </>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', display: 'block', mb: 0.75 }}>
              Upcoming
            </Typography>
            {upcoming.slice(0, 4).map((m) => {
              const isHome = m.homeTeam.shortCode === teamCode
              const opp = isHome ? m.awayTeam.shortCode : m.homeTeam.shortCode
              return (
                <Box key={m.id} onClick={() => { navigate(`/matches/${m.id}`); onClose() }}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, px: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)', mb: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 52 }}>{formatShortDate(m.utcDate)}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 14 }}>{isHome ? 'vs' : '@'}</Typography>
                  <TeamFlag tla={opp} size={18} />
                  <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 600, flex: 1, fontSize: '0.9rem', ml: 0.5 }}>{opp}</Typography>
                  <Typography variant="caption" color="primary.main">{formatKickoff(m.utcDate)}</Typography>
                </Box>
              )
            })}
            <Divider sx={{ my: 1.5 }} />
          </>
        )}

        {/* Recent results */}
        {finished.length > 0 && (
          <>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', display: 'block', mb: 0.75 }}>
              Results
            </Typography>
            {finished.map((m) => {
              const isHome = m.homeTeam.shortCode === teamCode
              const opp = isHome ? m.awayTeam.shortCode : m.homeTeam.shortCode
              const ts = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0)
              const os = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0)
              const result = ts > os ? 'W' : ts === os ? 'D' : 'L'
              const rc = result === 'W' ? '#4caf50' : result === 'D' ? '#ff9800' : '#f44336'
              return (
                <Box key={m.id} onClick={() => { navigate(`/matches/${m.id}`); onClose() }}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, px: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)', mb: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 52 }}>{formatShortDate(m.utcDate)}</Typography>
                  <TeamFlag tla={opp} size={18} />
                  <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 600, flex: 1, fontSize: '0.9rem', ml: 0.5 }}>{opp}</Typography>
                  <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '0.9rem' }}>{ts}–{os}</Typography>
                  <Box sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: rc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff' }}>{result}</Typography>
                  </Box>
                </Box>
              )
            })}
            {scorers.length > 0 && <Divider sx={{ my: 1.5 }} />}
          </>
        )}

        {/* Top scorers */}
        {scorers.length > 0 && (
          <>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', display: 'block', mb: 0.75 }}>
              Top Scorers
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {scorers.map(({ name, goals }) => (
                <Chip
                  key={name}
                  label={`${name.split(' ').pop()} · ${goals}`}
                  size="small"
                  sx={{ fontSize: '0.7rem', height: 22, bgcolor: owner ? `${owner.color}22` : undefined, border: `1px solid ${owner?.color ?? 'rgba(255,255,255,0.2)'}55` }}
                />
              ))}
            </Box>
          </>
        )}

        {teamMatches.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No matches found for {teamCode}
          </Typography>
        )}
      </Box>
    </Drawer>
  )
}
