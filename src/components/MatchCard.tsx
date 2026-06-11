import { useNavigate } from 'react-router-dom'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import type { Match } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKickoffTime(utcDate: string): string {
  const date = new Date(utcDate)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatStageLabel(stage: string): string {
  return stage
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function StatusChip({ match }: { match: Match }) {
  const { status } = match

  if (status === 'IN_PLAY') {
    return (
      <Chip
        label="LIVE"
        size="small"
        color="error"
        sx={{ animation: 'livePulse 1.5s ease-in-out infinite', fontWeight: 700 }}
      />
    )
  }

  if (status === 'PAUSED') {
    return <Chip label="HT" size="small" sx={{ bgcolor: 'warning.main', color: 'warning.contrastText', fontWeight: 700 }} />
  }

  if (status === 'FINISHED') {
    return <Chip label="FT" size="small" sx={{ color: 'text.secondary', bgcolor: 'action.disabledBackground' }} />
  }

  // SCHEDULED / TIMED — show kickoff time
  return (
    <Chip
      label={formatKickoffTime(match.utcDate)}
      size="small"
      color="info"
    />
  )
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: Match
}

export const MatchCard = ({ match }: MatchCardProps) => {
  const navigate = useNavigate()
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED'
  const hasScore = match.homeScore !== null && match.awayScore !== null

  const homeCode = match.homeTeam.shortCode || match.homeTeam.name.slice(0, 3).toUpperCase()
  const awayCode = match.awayTeam.shortCode || match.awayTeam.name.slice(0, 3).toUpperCase()

  return (
    <Card>
      <CardActionArea onClick={() => navigate(`/matches/${match.id}`)}>
        <CardContent>
          {/* Header: stage label + status chip */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {formatStageLabel(match.stage)}
              {match.group ? ` · ${match.group}` : ''}
            </Typography>
            <StatusChip match={match} />
          </Box>

          {/* Score row */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 1.5 }}>
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

          {/* Live minute indicator */}
          {isLive && match.minute != null && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                {match.minute}&apos;
              </Typography>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
