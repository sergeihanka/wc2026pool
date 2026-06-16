import { APP_VERSION } from '@/version'

const VERSION_KEY = 'wcp_version'
const SESSION_KEY = 'wcp_session'

/** Clears service worker caches and all localStorage except the session key. */
export async function clearAppCaches(): Promise<void> {
  // Service worker caches
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }

  // localStorage — keep session so user stays logged in
  const session = localStorage.getItem(SESSION_KEY)
  localStorage.clear()
  if (session !== null) {
    localStorage.setItem(SESSION_KEY, session)
  }
}

/** Full wipe including session — used for switch-user flow. */
export async function clearAllAndLogout(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }
  localStorage.clear()
}

/**
 * Called once at boot. If the stored version differs from the current build,
 * wipes stale caches while preserving the user session.
 */
export async function checkVersionAndClear(): Promise<void> {
  const stored = localStorage.getItem(VERSION_KEY)
  if (stored !== APP_VERSION) {
    await clearAppCaches()
    localStorage.setItem(VERSION_KEY, APP_VERSION)
    console.info(`[cache] Cleared stale caches (${stored ?? 'none'} → ${APP_VERSION})`)
  }
}
