/**
 * cron-poll — Netlify scheduled function that runs every minute.
 * Fetches WC matches from football-data.org and upserts into Supabase.
 *
 * Required Netlify env vars:
 *   SUPABASE_URL              — e.g. https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
 *   VITE_FOOTBALL_API_KEY     — football-data.org v4 API key
 */

import type { Config } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

interface ApiTeam { id: number; name: string; tla: string }
interface ApiGoal  { minute: number | string | null; scorer: { name: string } | null; team: { id: number } }
interface ApiBooking { minute: number | string | null; team: { id: number }; card: string; player?: { name: string } | null }
interface ApiMatch {
  id: number; utcDate: string; status: string; stage: string; group: string | null
  score: { fullTime: { home: number | null; away: number | null } }
  minute: number | null; homeTeam: ApiTeam; awayTeam: ApiTeam
  goals: ApiGoal[]; bookings?: ApiBooking[]
}

export default async function handler(): Promise<void> {
  const supabaseUrl = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL']
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  const apiKey     = process.env['VITE_FOOTBALL_API_KEY'] ?? process.env['FOOTBALL_API_KEY']

  if (!supabaseUrl || !supabaseKey || !apiKey) {
    console.error('[cron-poll] Missing env vars. Have:', {
      SUPABASE_URL: !!process.env['SUPABASE_URL'],
      VITE_SUPABASE_URL: !!process.env['VITE_SUPABASE_URL'],
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseKey,
      VITE_FOOTBALL_API_KEY: !!apiKey,
    })
    return
  }
  console.log('[cron-poll] Using Supabase URL:', supabaseUrl.slice(0, 40) + '...')

  const supabase = createClient(supabaseUrl, supabaseKey)

  let apiRes: Response
  try {
    apiRes = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': apiKey },
    })
  } catch (err) {
    console.error('[cron-poll] Network error reaching football-data.org:', err)
    return
  }

  if (!apiRes.ok) {
    console.error('[cron-poll] API error', apiRes.status, await apiRes.text())
    return
  }

  const payload = await apiRes.json() as { matches?: ApiMatch[] }
  const matches = payload.matches ?? []

  if (matches.length === 0) {
    console.warn('[cron-poll] API returned 0 matches — key may lack WC access')
    return
  }

  const now = new Date().toISOString()

  const baseRows = matches.map((m) => ({
    id: m.id,
    home_team: m.homeTeam.name,
    away_team: m.awayTeam.name,
    home_score: m.score.fullTime.home,
    away_score: m.score.fullTime.away,
    status: m.status === 'TIMED' ? 'SCHEDULED' : m.status,
    stage: m.stage,
    match_group: m.group ?? null,
    utc_date: m.utcDate,
    goals: (m.goals ?? []).map((g) => ({
      scorer: g.scorer?.name ?? null,
      minute: g.minute ?? 0,
      team: g.team.id === m.homeTeam.id ? 'home' : 'away',
    })),
    live_minute: m.minute ?? null,
    updated_at: now,
  }))

  const rowsWithBookings = baseRows.map((row, i) => ({
    ...row,
    bookings: (matches[i].bookings ?? []).map((b) => ({
      minute: b.minute ?? 0,
      team: b.team.id === matches[i].homeTeam.id ? 'home' : 'away',
      card: b.card,
      player: b.player?.name ?? null,
    })),
  }))

  const { error: err1 } = await supabase
    .from('match_results_cache')
    .upsert(rowsWithBookings, { onConflict: 'id' })

  if (err1) {
    console.warn('[cron-poll] Upsert with bookings failed, retrying without:', err1.message, err1.details, err1.hint)
    const { error: err2 } = await supabase
      .from('match_results_cache')
      .upsert(baseRows, { onConflict: 'id' })
    if (err2) {
      console.error('[cron-poll] Supabase upsert error:', err2.message, err2.details, err2.hint)
      return
    }
  }

  const live = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED').length
  console.log(`[cron-poll] OK — ${matches.length} matches (${live} live) at ${now}`)
}

// Runs every minute automatically on Netlify
export const config: Config = { schedule: '* * * * *' }
