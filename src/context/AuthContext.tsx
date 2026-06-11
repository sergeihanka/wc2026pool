import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { PoolMember, SessionData } from '@/types'
import { POOL_MEMBERS } from '@/config/pool'

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_KEY = 'wcp_session'
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AuthContextValue {
  currentMember: PoolMember | null
  isAuthenticated: boolean
  isLoading: boolean
  login(memberId: string): boolean
  logout(): void
}

export const AuthContext = createContext<AuthContextValue>({
  currentMember: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => false,
  logout: () => undefined,
})

// ─── localStorage helpers ────────────────────────────────────────────────────

function readSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionData
  } catch {
    return null
  }
}

function writeSession(memberId: string): void {
  const session: SessionData = {
    memberId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__wcp_ls_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

function findMember(memberId: string): PoolMember | null {
  return POOL_MEMBERS.find((m) => m.id === memberId) ?? null
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentMember, setCurrentMember] = useState<PoolMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const lsAvailable = isLocalStorageAvailable()

  // On mount: restore session if valid
  useEffect(() => {
    if (!lsAvailable) {
      console.warn(
        '[AuthProvider] localStorage is unavailable. ' +
          'Session will not persist across tab close.',
      )
      setIsLoading(false)
      return
    }

    const session = readSession()
    if (!session) {
      setIsLoading(false)
      return
    }

    if (session.expiresAt <= Date.now()) {
      clearSession()
      setIsLoading(false)
      return
    }

    const member = findMember(session.memberId)
    if (member) {
      setCurrentMember(member)
    }
    setIsLoading(false)
  }, [lsAvailable])

  // Listen for storage events — if wcp_session is cleared in another tab, log out here
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === SESSION_KEY && event.newValue === null) {
        setCurrentMember(null)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const login = useCallback(
    (memberId: string): boolean => {
      const member = findMember(memberId)
      if (!member) return false

      if (lsAvailable) {
        writeSession(memberId)
      }
      setCurrentMember(member)
      return true
    },
    [lsAvailable],
  )

  const logout = useCallback((): void => {
    if (lsAvailable) {
      clearSession()
    }
    setCurrentMember(null)
  }, [lsAvailable])

  return (
    <AuthContext.Provider
      value={{
        currentMember,
        isAuthenticated: currentMember !== null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
