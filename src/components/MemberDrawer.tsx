import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import CloseIcon from '@mui/icons-material/Close'
import { TeamFlag } from '@/components/TeamFlag'
import { poolService } from '@/services/PoolService'
import type { Match, PoolMember } from '@/types'

function formatGD(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd)
}

const RANK_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }

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

  const stats = row ? [
    { label: 'Rank',    value: `#${row.rank}` },
    { label: 'Points',  value: String(row.points) },
    { label: 'W/D/L',   value: `${row.won}/${row.drawn}/${row.lost}` },
    { label: 'GD',      value: formatGD(row.goalDifference) },
    { label: 'GF',      value: String(row.goalsFor) },
    { label: 'GA',      value: String(row.goalsAgainst) },
    { label: '🟨',      value: String(row.yellowCards) },
    { label: '🟥',      value: String(row.redCards) },
    { label: 'Played',  value: String(row.played) },
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
            maxHeight: '70vh',
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
            {rankColor && (
              <Typography variant="caption" sx={{ color: rankColor, fontWeight: 700 }}>
                #{row?.rank} · {row?.points} pts
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Teams */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {member?.teams.map((t) => (
            <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 1.5,
              bgcolor: `${member.color}22`, border: `1px solid ${member.color}55` }}>
              <TeamFlag tla={t} size={20} />
              <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '0.9rem' }}>{t}</Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Stats grid */}
        {stats.length > 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
            {stats.map((s) => (
              <Box key={s.label} sx={{ textAlign: 'center', py: 0.5 }}>
                <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1.4rem', lineHeight: 1,
                  color: rankColor && s.label === 'Rank' ? rankColor : 'text.primary' }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No match data yet
          </Typography>
        )}
      </Box>
    </Drawer>
  )
}
