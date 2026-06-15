import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import CloseIcon from '@mui/icons-material/Close'
import { TeamFlag } from '@/components/TeamFlag'
import { TEAM_NAMES } from '@/lib/flags'
import { poolService } from '@/services/PoolService'
import type { Match, PoolMember } from '@/types'

function formatGD(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd)
}

const RANK_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }

function computeTeamStats(teamCode: string, matches: Match[]) {
  let played = 0, won = 0, drawn = 0, lost = 0, points = 0, gf = 0, ga = 0
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    const isHome = m.homeTeam.shortCode === teamCode
    const isAway = m.awayTeam.shortCode === teamCode
    if (!isHome && !isAway) continue
    played++
    const hs = m.homeScore ?? 0, as_ = m.awayScore ?? 0
    if (isHome) {
      gf += hs; ga += as_
      if (hs > as_) { won++; points += 3 }
      else if (hs === as_) { drawn++; points += 1 }
      else { lost++ }
    } else {
      gf += as_; ga += hs
      if (as_ > hs) { won++; points += 3 }
      else if (as_ === hs) { drawn++; points += 1 }
      else { lost++ }
    }
  }
  return { played, won, drawn, lost, points, gf, ga, gd: gf - ga }
}

interface Props {
  member: PoolMember | null
  matches: Match[]
  onClose: () => void
}

export function MemberDrawer({ member, matches, onClose }: Props) {
  const open = !!member

  const rows = member ? poolService.computeLeaderboard(matches) : []
  const row = rows.find((r) => r.member.id === member?.id)
  const rankColor = row ? (RANK_COLORS[row.rank] ?? undefined) : undefined

  const teamStats = member
    ? member.teams.map((code) => ({ code, ...computeTeamStats(code, matches) }))
    : []

  const overallStats = row ? [
    { label: 'Rank',   value: `#${row.rank}`,                      color: rankColor },
    { label: 'Points', value: String(row.points)                                    },
    { label: 'W/D/L',  value: `${row.won}/${row.drawn}/${row.lost}`                },
    { label: 'GD',     value: formatGD(row.goalDifference)                          },
    { label: 'GF',     value: String(row.goalsFor)                                  },
    { label: 'GA',     value: String(row.goalsAgainst)                              },
    { label: '🟨',     value: String(row.yellowCards)                               },
    { label: '🟥',     value: String(row.redCards)                                  },
    { label: 'Played', value: String(row.played)                                    },
  ] : []

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80vh',
            bgcolor: 'background.paper',
          },
        },
      }}
    >
      {/* Drag handle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 0.5 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
      </Box>

      <Box sx={{ px: 2, pb: 4, overflowY: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
          <Avatar sx={{ bgcolor: member?.color, width: 44, height: 44, fontWeight: 700, fontSize: '0.85rem',
            boxShadow: rankColor ? `0 0 0 3px ${rankColor}` : undefined }}>
            {member?.avatarInitials}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1.2rem', lineHeight: 1.1 }}>
              {member?.displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: rankColor ?? 'text.secondary', fontWeight: 700 }}>
              {row ? `#${row.rank} · ${row.points} pts` : 'No data yet'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Overall stats grid */}
        {overallStats.length > 0 && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, mb: 2.5 }}>
              {overallStats.map((s) => (
                <Box key={s.label} sx={{ textAlign: 'center', py: 0.5 }}>
                  <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1.4rem', lineHeight: 1,
                    color: s.color ?? 'text.primary' }}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </Box>
              ))}
            </Box>
            <Divider sx={{ mb: 2 }} />
          </>
        )}

        {/* Per-team breakdown */}
        {teamStats.length > 0 && (
          <>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', display: 'block', mb: 1.25 }}>
              By Team
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {teamStats.map((t) => (
                <Box key={t.code} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.25, py: 1,
                  borderRadius: 1.5, bgcolor: `${member!.color}11`, border: `1px solid ${member!.color}33` }}>
                  <TeamFlag tla={t.code} size={22} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.1 }}>
                      {TEAM_NAMES[t.code] ?? t.code}
                    </Typography>
                    {t.played > 0 ? (
                      <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1.3 }}>
                        {t.won}W · {t.drawn}D · {t.lost}L · GD {formatGD(t.gd)} · {t.gf}/{t.ga}
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1.3 }}>
                        No matches played yet
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1.3rem', lineHeight: 1, color: member!.color }}>
                      {t.points}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>pts</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}

        {overallStats.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No match data yet
          </Typography>
        )}
      </Box>
    </Drawer>
  )
}
