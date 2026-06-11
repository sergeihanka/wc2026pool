import { useEffect, useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import IosShareIcon from '@mui/icons-material/IosShare'
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const ANDROID_DISMISSED_KEY = 'wcp_install_dismissed'
const IOS_DISMISSED_KEY = 'wcp_ios_install_dismissed'

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

function isMobile(): boolean {
  return window.innerWidth <= 768
}

function isIOS(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    'standalone' in navigator
  )
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [androidOpen, setAndroidOpen] = useState(false)
  const [iosOpen, setIosOpen] = useState(false)

  useEffect(() => {
    if (!isMobile() || isStandalone()) return

    if (isIOS()) {
      if (!localStorage.getItem(IOS_DISMISSED_KEY)) {
        setIosOpen(true)
      }
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      if (localStorage.getItem(ANDROID_DISMISSED_KEY)) return
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setAndroidOpen(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setDeferredPrompt(null)
    setAndroidOpen(false)
  }

  const handleAndroidDismiss = () => {
    localStorage.setItem(ANDROID_DISMISSED_KEY, '1')
    setAndroidOpen(false)
  }

  const handleIosClose = () => {
    localStorage.setItem(IOS_DISMISSED_KEY, '1')
    setIosOpen(false)
  }

  return (
    <>
      <Snackbar
        open={androidOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message="Add WC Pool to your home screen"
        action={
          <>
            <Button color="primary" size="small" onClick={handleAndroidInstall}>
              Install
            </Button>
            <IconButton size="small" color="inherit" onClick={handleAndroidDismiss}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
      />

      <SwipeableDrawer
        anchor="bottom"
        open={iosOpen}
        onOpen={() => setIosOpen(true)}
        onClose={handleIosClose}
        disableSwipeToOpen
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              bgcolor: 'background.paper',
              px: 3,
              pb: 4,
              pt: 2,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={handleIosClose} size="small" color="inherit">
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography variant="h5" gutterBottom>
          Install WC Pool
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          <IosShareIcon color="primary" />
          <Typography variant="body1">Tap the Share button</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          <AddBoxOutlinedIcon color="primary" />
          <Typography variant="body1">Tap &apos;Add to Home Screen&apos;</Typography>
        </Box>
      </SwipeableDrawer>
    </>
  )
}
