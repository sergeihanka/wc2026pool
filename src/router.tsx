import { createBrowserRouter, Navigate } from 'react-router-dom'
import RouteGuard from '@/components/RouteGuard'
import LoginPage from '@/pages/LoginPage'
import ScoresPage from '@/pages/ScoresPage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import MatchDetailPage from '@/pages/MatchDetailPage'
import MyPoolPage from '@/pages/MyPoolPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Navigate to="/scores" replace />,
  },
  {
    element: <RouteGuard />,
    children: [
      { path: '/scores', element: <ScoresPage /> },
      { path: '/scores/:matchId', element: <MatchDetailPage /> },
      { path: '/matches/:matchId', element: <MatchDetailPage /> },
      { path: '/my-pool', element: <MyPoolPage /> },
      { path: '/leaderboard', element: <LeaderboardPage /> },
    ],
  },
])
