import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import OneSignal from 'react-onesignal'
import { router } from './router'
import theme from './theme'
import { AuthProvider } from '@/context/AuthContext'
import { ONESIGNAL_APP_ID } from '@/config/env'
import { checkVersionAndClear } from '@/lib/cacheUtils'

// Clear stale caches on version mismatch before rendering (preserves session)
checkVersionAndClear().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
  )

  if (ONESIGNAL_APP_ID) {
    OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: '/' },
    }).catch(console.error)
  }
}).catch(console.error)
