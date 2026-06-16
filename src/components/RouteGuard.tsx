import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Badge from '@mui/material/Badge'
import CircularProgress from '@mui/material/CircularProgress'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import HomeIcon from '@mui/icons-material/Home'
import GroupsIcon from '@mui/icons-material/Groups'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ChatBubbleIcon from '@mui/icons-material/ChatBubble'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import InstallBanner from '@/components/InstallBanner'
import { APP_VERSION } from '@/version'

const NAV_BG = '#0a1628'
const NAV_H = 56

function resolveNavValue(pathname: string): string {
  if (pathname.startsWith('/my-pool')) return '/my-pool'
  if (pathname.startsWith('/scores') || pathname.startsWith('/matches')) return '/scores'
  if (pathname.startsWith('/chat')) return '/chat'
  return '/'
}

export default function RouteGuard() {
  const { isAuthenticated, isLoading, currentMember } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { unreadMentions } = useChat(currentMember?.id ?? null)

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

  const navItems = [
    { label: 'Home',     value: '/',        icon: <HomeIcon /> },
    { label: 'My Pool',  value: '/my-pool', icon: <GroupsIcon /> },
    { label: 'Schedule', value: '/scores',  icon: <CalendarMonthIcon /> },
    {
      label: 'Chat',
      value: '/chat',
      icon: (
        <Badge badgeContent={unreadMentions} color="error" max={9}>
          <ChatBubbleIcon />
        </Badge>
      ),
    },
  ]

  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Status bar safe area */}
      <Box sx={{ flexShrink: 0, height: 'env(safe-area-inset-top, 0px)', bgcolor: 'background.default' }} />

      <InstallBanner />

      {/* Version badge */}
      <Box sx={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 6px)', right: 10, zIndex: 1200, pointerEvents: 'none' }}>
        <Box component="span" sx={{ fontSize: 10, color: 'text.disabled', fontFamily: 'monospace', letterSpacing: 0.5 }}>
          v{APP_VERSION}
        </Box>
      </Box>

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Outlet />
      </Box>

      {/* Bottom nav — plain div avoids MUI elevation white overlay */}
      <div style={{ flexShrink: 0, backgroundColor: NAV_BG, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        <BottomNavigation
          value={navValue}
          onChange={(_, v: string) => navigate(v)}
          showLabels
          style={{ height: NAV_H, backgroundColor: NAV_BG, backgroundImage: 'none' }}
        >
          {navItems.map((item) => (
            <BottomNavigationAction
              key={item.value}
              label={item.label}
              value={item.value}
              icon={item.icon}
            />
          ))}
        </BottomNavigation>
      </div>
    </Box>
  )
}
