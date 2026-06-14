import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Paper from '@mui/material/Paper'
import HomeIcon from '@mui/icons-material/Home'
import GroupsIcon from '@mui/icons-material/Groups'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { useAuth } from '@/hooks/useAuth'
import InstallBanner from '@/components/InstallBanner'

const NAV_ITEMS = [
  { label: 'Home', value: '/', icon: <HomeIcon /> },
  { label: 'My Pool', value: '/my-pool', icon: <GroupsIcon /> },
  { label: 'Schedule', value: '/scores', icon: <CalendarMonthIcon /> },
]

function resolveNavValue(pathname: string): string {
  if (pathname.startsWith('/my-pool')) return '/my-pool'
  if (pathname.startsWith('/scores') || pathname.startsWith('/matches')) return '/scores'
  return '/'
}

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
      <Box sx={{ flex: 1, overflowY: 'auto', pb: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}>
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
          bgcolor: '#0a1628',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <BottomNavigation
          value={navValue}
          onChange={(_, newValue: string) => navigate(newValue)}
          showLabels
          sx={{ bgcolor: '#0a1628' }}
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
