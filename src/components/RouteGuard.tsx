import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '@/hooks/useAuth'
import InstallBanner from '@/components/InstallBanner'

/**
 * RouteGuard — wraps protected routes.
 *
 * Behaviour:
 * - While auth is resolving (isLoading): shows a centred spinner — no redirect.
 * - Unauthenticated: redirects to /login, passing the current location as state.from
 *   so LoginPage can navigate back after a successful sign-in.
 * - Authenticated: renders <Outlet /> (child routes).
 */
export default function RouteGuard() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

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

  return (
    <>
      <InstallBanner />
      <Outlet />
    </>
  )
}
