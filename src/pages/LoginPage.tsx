import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import { useAuth } from '@/hooks/useAuth'
import { POOL_MEMBERS } from '@/config/pool'
import type { PoolMember } from '@/types'

interface LocationState {
  from?: { pathname: string }
}

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  if (isAuthenticated) {
    return <Navigate to="/scores" replace />
  }

  function handleSelectMember(member: PoolMember) {
    login(member.id)
    const destination = state?.from?.pathname ?? '/scores'
    navigate(destination, { replace: true })
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontWeight: 700,
          letterSpacing: 2,
          mb: 1,
          textAlign: 'center',
        }}
      >
        WORLD CUP POOL 2026
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select your name to continue
      </Typography>

      <Grid container spacing={2} sx={{ maxWidth: 480, width: '100%' }}>
        {POOL_MEMBERS.map((member) => (
          <Grid key={member.id} size={{ xs: 6, sm: 4 }}>
            <Card elevation={0} sx={{ border: '2px solid transparent' }}>
              <CardActionArea
                onClick={() => handleSelectMember(member)}
                aria-label={`Sign in as ${member.displayName}`}
                sx={{ p: 1.5 }}
              >
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Avatar
                    sx={{
                      bgcolor: 'primary.dark',
                      width: 40,
                      height: 40,
                      fontSize: '0.8rem',
                      mb: 1,
                    }}
                  >
                    {member.avatarInitials}
                  </Avatar>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700 }}
                  >
                    {member.displayName}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {member.teams.map((teamCode) => (
                      <Chip
                        key={teamCode}
                        size="small"
                        label={teamCode}
                        variant="outlined"
                        color="primary"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
