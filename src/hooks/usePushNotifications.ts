import { useState, useEffect, useCallback, useRef } from 'react'
import OneSignal from 'react-onesignal'
import { supabase } from '@/lib/supabase'
import { POOL_MEMBERS } from '@/config/pool'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PushState {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  playerId: string | null
}

interface UsePushNotificationsReturn {
  state: PushState
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

// ─── Feature detection ─────────────────────────────────────────────────────────

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Manages OneSignal push notification subscription for the given pool member.
 *
 * - Reads subscription state from OneSignal.User.PushSubscription on mount.
 * - subscribe() opts the user in, persists to Supabase, and sets OneSignal tags.
 * - unsubscribe() opts the user out and removes the Supabase record.
 * - All errors are caught and logged; the hook never throws.
 */
export function usePushNotifications(memberId: string | null): UsePushNotificationsReturn {
  const supported = isPushSupported()

  const [state, setState] = useState<PushState>({
    isSupported: supported,
    isSubscribed: false,
    isLoading: supported, // loading until we read OneSignal state
    playerId: null,
  })

  // Track whether the component is still mounted to avoid setState after unmount.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ── Read initial subscription state from OneSignal ────────────────────────

  useEffect(() => {
    if (!supported) return

    // OneSignal init is called in main.tsx as a non-blocking promise.
    // We poll briefly to wait for it to be ready before reading state.
    let attempts = 0
    const MAX_ATTEMPTS = 20
    const INTERVAL_MS = 250

    const intervalId = setInterval(() => {
      attempts++
      try {
        const sub = OneSignal.User.PushSubscription
        // optedIn is undefined until OneSignal SDK is ready
        if (sub.optedIn !== undefined || attempts >= MAX_ATTEMPTS) {
          clearInterval(intervalId)
          if (mountedRef.current) {
            setState({
              isSupported: true,
              isSubscribed: sub.optedIn ?? false,
              isLoading: false,
              playerId: sub.id ?? null,
            })
          }
        }
      } catch {
        // SDK not ready yet — keep polling
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(intervalId)
          if (mountedRef.current) {
            setState(prev => ({ ...prev, isLoading: false }))
          }
        }
      }
    }, INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [supported])

  // ── Listen for subscription changes emitted by OneSignal ─────────────────

  useEffect(() => {
    if (!supported) return

    function handleChange() {
      if (!mountedRef.current) return
      try {
        const sub = OneSignal.User.PushSubscription
        setState(prev => ({
          ...prev,
          isSubscribed: sub.optedIn ?? false,
          playerId: sub.id ?? null,
        }))
      } catch (err) {
        console.error('[usePushNotifications] Failed to read subscription after change:', err)
      }
    }

    try {
      OneSignal.User.PushSubscription.addEventListener('change', handleChange)
    } catch {
      // SDK may not be ready — listener will be missed but initial poll covers it
    }

    return () => {
      try {
        OneSignal.User.PushSubscription.removeEventListener('change', handleChange)
      } catch {
        // ignore cleanup errors
      }
    }
  }, [supported])

  // ── subscribe ─────────────────────────────────────────────────────────────

  const subscribe = useCallback(async (): Promise<void> => {
    if (!supported) return

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await OneSignal.User.PushSubscription.optIn()

      const playerId = OneSignal.User.PushSubscription.id ?? null

      if (memberId && playerId) {
        const member = POOL_MEMBERS.find(m => m.id === memberId)
        const teams = member?.teams ?? []

        // Persist subscription record to Supabase
        const { error: upsertError } = await supabase
          .from('push_subscriptions')
          .upsert(
            {
              member_id: memberId,
              onesignal_player_id: playerId,
              teams,
            },
            { onConflict: 'member_id' },
          )

        if (upsertError) {
          console.error('[usePushNotifications] Supabase upsert failed:', upsertError)
        }

        // Set OneSignal tags for server-side targeting (WCP-025)
        const teamTags = teams.reduce<Record<string, string>>(
          (acc, teamCode) => ({ ...acc, [`team_${teamCode}`]: '1' }),
          {},
        )

        OneSignal.User.addTags({
          memberId,
          ...teamTags,
        })
      }

      if (mountedRef.current) {
        setState({
          isSupported: true,
          isSubscribed: OneSignal.User.PushSubscription.optedIn ?? true,
          isLoading: false,
          playerId,
        })
      }
    } catch (err) {
      console.error('[usePushNotifications] subscribe() failed:', err)
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }
  }, [memberId, supported])

  // ── unsubscribe ───────────────────────────────────────────────────────────

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!supported) return

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await OneSignal.User.PushSubscription.optOut()

      if (memberId) {
        const { error: deleteError } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('member_id', memberId)

        if (deleteError) {
          console.error('[usePushNotifications] Supabase delete failed:', deleteError)
        }
      }

      if (mountedRef.current) {
        setState({
          isSupported: true,
          isSubscribed: false,
          isLoading: false,
          playerId: null,
        })
      }
    } catch (err) {
      console.error('[usePushNotifications] unsubscribe() failed:', err)
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }
  }, [memberId, supported])

  return { state, subscribe, unsubscribe }
}
