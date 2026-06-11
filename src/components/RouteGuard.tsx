import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Paper from '@mui/material/Paper'
import SportsIcon from '@mui/icons-material/Sports'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GroupsIcon from '@mui/icons-material/Groups'
import { useAuth } from '@/hooks/useAuth'
import InstallBanner from '@/components/InstallBanner'

const NAV_ITEMS = [
  { label: 'Scores', value: '/scores', icon: <SportsIcon /> },
  { label: 'Standings', value: '/leaderboard', icon: <EmojiEventsIcon /> },
  { label: 'My Pool', value: '/my-pool', icon: <GroupsIcon /> },
]

function resolveNavValue(pathname: string): string {
  if (pathname.startsWith('/leaderboard')) return '/leaderboard'
  if (pathname.startsWith('/my-pool')) return '/my-pool'
  return '/scores'
}

/**
 * RouteGuard — wraps protected routes.
 *
 * Behaviour:
 * - While auth is resolving (isLoading): shows a centred spinner — no redirect.
 * - Unauthenticated: redirects to /login, passing the current location as state.from
 *   so LoginPage can navigate back after a successful sign-in.
 * - Authenticated: renders child routes with a persistent bottom navigation bar.
 */
export default function RouteGuard() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const navValue = resolveNavValue(location.pathname)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <InstallBanner />
      <Box sx={{ flex: 1, overflowY: 'auto', pb: '56px' }}>
        <Outlet />
      </Box>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
        }}
      >
        <BottomNavigation
          value={navValue}
          onChange={(_, newValue: string) => navigate(newValue)}
          showLabels
        >
          {NAV_ITEMS.map((item) => (
            <BottomNavigationAction
              key={item.value}
              label={item.label}
              value={item.value}
              icon={item.icon}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  )
}
