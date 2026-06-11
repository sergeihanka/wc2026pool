/**
 * PollingService — singleton that polls FootballDataService on an adaptive interval
 * and upserts results to Supabase `match_results_cache`.
 *
 * Interval strategy:
 *   - 30 s  when any match is IN_PLAY or PAUSED
 *   - 5 min otherwise
 *
 * Rate cap: ≤ 8 calls per rolling 60-second window (football-data.org free tier: 10/min).
 * Visibility: pauses when tab is hidden, resumes immediately on visibility.
 */

import type { Match, Goal } from '@/types'
import { FootballDataService } from './FootballDataService'
import { supabase } from '@/lib/supabase'

const LIVE_STATUSES = new Set(['IN_PLAY', 'PAUSED'])
const INTERVAL_LIVE_MS = 30_000       // 30 seconds
const INTERVAL_IDLE_MS = 5 * 60_000  // 5 minutes
const RATE_LIMIT_WINDOW_MS = 60_000   // 1 minute
const RATE_LIMIT_MAX_CALLS = 8

// Shape that lives in Supabase `match_results_cache`
interface MatchDbRow {
  id: number
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  status: string
  stage: string
  match_group: string | null
  utc_date: string
  goals: Goal[]
  live_minute: number | null
  updated_at: string
}

function matchToDbRow(match: Match): MatchDbRow {
  return {
    id: match.id,
    home_team: match.homeTeam.name,
    away_team: match.awayTeam.name,
    home_score: match.homeScore,
    away_score: match.awayScore,
    status: match.status,
    stage: match.stage,
    match_group: match.group ?? null,
    utc_date: match.utcDate,
    goals: match.goals,
    live_minute: match.minute ?? null,
    updated_at: new Date().toISOString(),
  }
}

export class PollingService {
  private static instance: PollingService | null = null

  private scoreService: FootballDataService
  private intervalId: ReturnType<typeof setInterval> | null = null
  private isStarted = false
  private lastFetchTime: Date | null = null

  // Rolling window of request timestamps for rate-cap enforcement
  private requestTimestamps: number[] = []

  // IDs of FINISHED matches already written to cache — skip re-writing them
  private finishedCached = new Set<number>()

  private previousMatches = new Map<number, Match>()

  // Exponential back-off state for RATE_LIMIT errors from the upstream API
  private rateLimitBackoffMs = 60_000
  private isInRateLimitBackoff = false

  private constructor() {
    this.scoreService = new FootballDataService()
  }

  static getInstance(): PollingService {
    if (!PollingService.instance) {
      PollingService.instance = new PollingService()
    }
    return PollingService.instance
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.isStarted) return
    this.isStarted = true

    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    // Fetch immediately, then schedule the recurring interval
    void this.fetchAndUpsert().then(() => {
      if (this.isStarted && !this.intervalId) {
        this.scheduleInterval()
      }
    })
  }

  stop(): void {
    this.isStarted = false
    this.clearInterval()
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  }

  getLastFetchTime(): Date | null {
    return this.lastFetchTime
  }

  getIsPolling(): boolean {
    return this.isStarted
  }

  // ─── Visibility handling ─────────────────────────────────────────────────────

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.pausePolling()
    } else {
      this.resumePolling()
    }
  }

  /** Clears the interval but keeps isStarted = true */
  private pausePolling(): void {
    this.clearInterval()
  }

  /** Restarts polling with an immediate fetch then a fresh interval */
  private resumePolling(): void {
    if (!this.isStarted) return
    this.clearInterval()
    void this.fetchAndUpsert().then(() => {
      if (this.isStarted && !this.intervalId) {
        this.scheduleInterval()
      }
    })
  }

  // ─── Interval management ─────────────────────────────────────────────────────

  private scheduleInterval(intervalMs?: number): void {
    const ms = intervalMs ?? INTERVAL_IDLE_MS
    this.intervalId = setInterval(() => {
      void this.tick()
    }, ms)
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // ─── Main polling tick ───────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    this.clearInterval()
    await this.fetchAndUpsert()
    // fetchAndUpsert() owns all interval rescheduling (success + error paths)
  }

  private async fetchAndUpsert(): Promise<void> {
    if (this.isInRateLimitBackoff) return

    try {
      await this.enforceRateLimit()
      const matches = await this.scoreService.getMatches()
      this.lastFetchTime = new Date()

      const hasLive = matches.some((m) => LIVE_STATUSES.has(m.status))
      const nextIntervalMs = hasLive ? INTERVAL_LIVE_MS : INTERVAL_IDLE_MS

      this.clearInterval()
      if (this.isStarted) {
        this.scheduleInterval(nextIntervalMs)
      }

      await this.upsertToCache(matches)
      this.detectAndNotify(matches)
    } catch (err: unknown) {
      if (isFootballDataRateLimitError(err)) {
        console.error('[PollingService] Rate limit hit from upstream API. Backing off for', this.rateLimitBackoffMs, 'ms')
        this.isInRateLimitBackoff = true
        await new Promise((resolve) => setTimeout(resolve, this.rateLimitBackoffMs))
        this.rateLimitBackoffMs = Math.min(this.rateLimitBackoffMs * 2, 300_000)
        this.isInRateLimitBackoff = false
        if (this.isStarted) {
          this.scheduleInterval()
        }
      } else {
        console.error('[PollingService] Fetch error — will retry on next interval', err)
        if (this.isStarted) {
          this.scheduleInterval()
        }
      }
    }
  }

  // ─── Rate cap (client-side, rolling 60-second window) ────────────────────────

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    // Drop timestamps outside the rolling window
    this.requestTimestamps = this.requestTimestamps.filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS,
    )
    if (this.requestTimestamps.length >= RATE_LIMIT_MAX_CALLS) {
      const oldest = this.requestTimestamps[0]
      const waitMs = RATE_LIMIT_WINDOW_MS - (now - oldest) + 50 // 50 ms buffer
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
    this.requestTimestamps.push(Date.now())
  }

  // ─── Notification detection ──────────────────────────────────────────────────

  private detectAndNotify(newMatches: Match[]): void {
    if (typeof fetch === 'undefined') return

    const isFirstFetch = this.previousMatches.size === 0

    for (const match of newMatches) {
      const prev = this.previousMatches.get(match.id)

      if (!isFirstFetch && prev) {
        if (
          (prev.status === 'IN_PLAY' || prev.status === 'PAUSED') &&
          match.status === 'FINISHED'
        ) {
          this.postNotification({
            matchId: match.id,
            type: 'FULLTIME',
            teamShortCode: match.homeTeam.shortCode,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          })
        } else if (
          (prev.status === 'SCHEDULED' || prev.status === 'TIMED') &&
          match.status === 'IN_PLAY'
        ) {
          this.postNotification({
            matchId: match.id,
            type: 'KICKOFF',
            teamShortCode: match.homeTeam.shortCode,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          })
        }

        if (match.goals.length > prev.goals.length) {
          const prevKeys = new Set(
            prev.goals.map((g) => `${g.scorer}|${g.minute}|${g.team}`)
          )
          const newGoals = match.goals.filter(
            (g) => !prevKeys.has(`${g.scorer}|${g.minute}|${g.team}`)
          )
          for (const goal of newGoals) {
            this.postNotification({
              matchId: match.id,
              type: 'GOAL',
              teamShortCode: goal.team === 'home' ? match.homeTeam.shortCode : match.awayTeam.shortCode,
              minute: goal.minute as number,
              scorer: goal.scorer ?? undefined,
              homeTeam: match.homeTeam.name,
              awayTeam: match.awayTeam.name,
              homeScore: match.homeScore,
              awayScore: match.awayScore,
            })
          }
        }
      }
    }

    this.previousMatches = new Map(newMatches.map((m) => [m.id, m]))
  }

  private postNotification(payload: Record<string, unknown>): void {
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error('[PollingService] Notification error:', err)
    })
  }

  // ─── Supabase upsert ─────────────────────────────────────────────────────────

  private async upsertToCache(matches: Match[]): Promise<void> {
    const matchesToUpsert = matches.filter((match) => {
      if (match.status === 'FINISHED' && this.finishedCached.has(match.id)) {
        return false // already persisted — skip
      }
      return true
    })

    if (matchesToUpsert.length === 0) return

    const rows = matchesToUpsert.map(matchToDbRow)

    const { error } = await supabase
      .from('match_results_cache')
      .upsert(rows, { onConflict: 'id' })

    if (error) {
      console.error('[PollingService] Supabase upsert error:', error)
      return // don't crash — continue polling
    }

    // Track FINISHED matches so we skip them next time
    for (const match of matchesToUpsert) {
      if (match.status === 'FINISHED') {
        this.finishedCached.add(match.id)
      }
    }
  }
}

// ─── Type guard ───────────────────────────────────────────────────────────────

function isFootballDataRateLimitError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'RATE_LIMIT'
  )
}
