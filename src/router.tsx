import { createBrowserRouter, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import RouteGuard from '@/components/RouteGuard'
import LoginPage from '@/pages/LoginPage'

// ─── Placeholder pages (replaced by real implementations in future tickets) ───

function ScoresPlaceholder() {
  return <Box sx={{ p: 4, color: 'text.primary' }}>Scores</Box>
}

function MatchDetailPlaceholder() {
  return <Box sx={{ p: 4, color: 'text.primary' }}>Match Detail</Box>
}

function MyPoolPlaceholder() {
  return <Box sx={{ p: 4, color: 'text.primary' }}>My Pool</Box>
}

function LeaderboardPlaceholder() {
  return <Box sx={{ p: 4, color: 'text.primary' }}>Leaderboard</Box>
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Navigate to="/scores" replace />,
  },
  // Protected routes — all require authentication via RouteGuard
  {
    element: <RouteGuard />,
    children: [
      { path: '/scores', element: <ScoresPlaceholder /> },
      { path: '/scores/:matchId', element: <MatchDetailPlaceholder /> },
      { path: '/my-pool', element: <MyPoolPlaceholder /> },
      { path: '/leaderboard', element: <LeaderboardPlaceholder /> },
    ],
  },
])
