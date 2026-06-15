import { createBrowserRouter, Navigate } from 'react-router-dom'
import RouteGuard from '@/components/RouteGuard'
import LoginPage from '@/pages/LoginPage'
import HomePage from '@/pages/HomePage'
import ScoresPage from '@/pages/ScoresPage'
import MatchDetailPage from '@/pages/MatchDetailPage'
import MyPoolPage from '@/pages/MyPoolPage'
import ChatPage from '@/pages/ChatPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <RouteGuard />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/scores', element: <ScoresPage /> },
      { path: '/scores/:matchId', element: <MatchDetailPage /> },
      { path: '/matches/:matchId', element: <MatchDetailPage /> },
      { path: '/my-pool', element: <MyPoolPage /> },
      { path: '/chat', element: <ChatPage /> },
      { path: '/leaderboard', element: <Navigate to="/" replace /> },
    ],
  },
])
