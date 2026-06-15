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
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Status bar safe area */}
      <Box sx={{ flexShrink: 0, height: 'env(safe-area-inset-top, 0px)', bgcolor: NAV_BG }} />

      <InstallBanner />

      {/* Page content */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Outlet />
      </Box>

      {/* Bottom nav — paddingBottom fills the home-indicator zone with the same color */}
      <BottomNavigation
        value={navValue}
        onChange={(_, v: string) => navigate(v)}
        showLabels
        sx={{
          flexShrink: 0,
          bgcolor: NAV_BG,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          height: 'auto',
          // Override MUI's fixed height so padding is additive
          '& .MuiBottomNavigation-root': { height: 56 },
        }}
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
  )
}
