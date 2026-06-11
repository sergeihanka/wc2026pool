import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '../useAuth'

// ─── localStorage mock ────────────────────────────────────────────────────────

const SESSION_KEY = 'wcp_session'

function makeLocalStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  }
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  let lsMock: ReturnType<typeof makeLocalStorageMock>

  beforeEach(() => {
    lsMock = makeLocalStorageMock()
    Object.defineProperty(window, 'localStorage', {
      value: lsMock,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('login with correct credentials returns true and sets isAuthenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.currentMember).toBeNull()

    let loginResult: boolean
    act(() => {
      loginResult = result.current.login('sergei_hanka', 'hanka-arn-ned')
    })

    expect(loginResult!).toBe(true)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.currentMember).not.toBeNull()
    expect(result.current.currentMember?.id).toBe('sergei_hanka')
    expect(result.current.currentMember?.displayName).toBe('Sergei Hanka')
  })

  it('login with wrong password returns false and leaves isAuthenticated false', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    let loginResult: boolean
    act(() => {
      loginResult = result.current.login('sergei_hanka', 'wrong-password')
    })

    expect(loginResult!).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.currentMember).toBeNull()
  })

  it('logout clears auth state and removes session from localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.login('sergei_hanka', 'hanka-arn-ned')
    })
    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.currentMember).toBeNull()
    expect(lsMock.removeItem).toHaveBeenCalledWith(SESSION_KEY)
  })

  it('expired session on mount results in isAuthenticated = false', () => {
    const expiredSession = JSON.stringify({
      memberId: 'sergei_hanka',
      expiresAt: Date.now() - 1000, // already expired
    })
    lsMock.getItem.mockImplementation((key: string) =>
      key === SESSION_KEY ? expiredSession : null,
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.currentMember).toBeNull()
    // Should clear the expired session
    expect(lsMock.removeItem).toHaveBeenCalledWith(SESSION_KEY)
  })

  it('valid session on mount restores isAuthenticated = true without calling login', () => {
    const validSession = JSON.stringify({
      memberId: 'sergei_hanka',
      expiresAt: Date.now() + 1_000_000,
    })
    lsMock.getItem.mockImplementation((key: string) =>
      key === SESSION_KEY ? validSession : null,
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.currentMember?.id).toBe('sergei_hanka')
  })
})
