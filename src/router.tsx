import { createBrowserRouter } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import ScoresPage from '@/pages/ScoresPage'
import MatchDetailPage from '@/pages/MatchDetailPage'
import MyPoolPage from '@/pages/MyPoolPage'
import LeaderboardPage from '@/pages/LeaderboardPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/scores',
    element: <ScoresPage />,
  },
  {
    path: '/scores/:matchId',
    element: <MatchDetailPage />,
  },
  {
    path: '/my-pool',
    element: <MyPoolPage />,
  },
  {
    path: '/leaderboard',
    element: <LeaderboardPage />,
  },
])
