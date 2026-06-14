import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import HomeIcon from '@mui/icons-material/Home'
import GroupsIcon from '@mui/icons-material/Groups'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { useAuth } from '@/hooks/useAuth'
import InstallBanner from '@/components/InstallBanner'

const NAV_HEIGHT = 56
const NAV_BG = '#0a1628'

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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const navValue = resolveNavValue(location.pathname)

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden',
      }}
    >
      {/* Top safe-area spacer */}
      <Box sx={{ flexShrink: 0, height: 'env(safe-area-inset-top, 0px)', bgcolor: 'background.default' }} />

      <InstallBanner />

      {/* Scrollable page content */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Outlet />
      </Box>

      {/* Bottom nav — sits above the home-indicator safe area */}
      <Box
        sx={{
          flexShrink: 0,
          bgcolor: NAV_BG,
          // Extend background colour into the home-indicator zone
          pb: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <BottomNavigation
          value={navValue}
          onChange={(_, newValue: string) => navigate(newValue)}
          showLabels
          sx={{ height: NAV_HEIGHT, bgcolor: NAV_BG }}
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
      </Box>
    </Box>
  )
}
