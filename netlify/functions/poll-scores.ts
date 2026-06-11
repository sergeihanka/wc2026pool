/**
 * poll-scores — server-side Netlify Scheduled Function.
 *
 * Fetches all WC matches from football-data.org and upserts them into Supabase.
 * Browsers never call the API directly; they subscribe to Supabase Realtime and
 * get instant updates whenever this function writes new data.
 *
 * Schedule: every 1 minute (Netlify free tier minimum).
 * For faster live-match updates, point an external cron (e.g. cron-job.org)
 * at /.netlify/functions/poll-scores every 30 seconds — it also accepts HTTP POST.
 *
 * Required Netlify env vars (set in Netlify dashboard → Site configuration → Env vars):
 *   SUPABASE_URL              — same as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS for writes)
 *   FOOTBALL_API_KEY          — football-data.org API key
 */

import type { Config, Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// ─── API types ────────────────────────────────────────────────────────────────

interface ApiTeam {
  id: number
  name: string
  tla: string
}

interface ApiGoal {
  minute: number | string | null
  scorer: { name: string } | null
  team: { id: number }
}

interface ApiBooking {
  minute: number | string | null
  team: { id: number }
  card: 'YELLOW' | 'RED' | 'YELLOW_RED'
  player?: { name: string } | null
}

interface ApiMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  group: string | null
  score: { fullTime: { home: number | null; away: number | null } }
  minute: number | null
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  goals: ApiGoal[]
  bookings?: ApiBooking[]
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(_req: Request, _context: Context): Promise<Response> {
  const supabaseUrl = process.env['SUPABASE_URL']
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  const apiKey = process.env['FOOTBALL_API_KEY']

  if (!supabaseUrl || !supabaseKey || !apiKey) {
    const missing = [
      !supabaseUrl && 'SUPABASE_URL',
      !supabaseKey && 'SUPABASE_SERVICE_ROLE_KEY',
      !apiKey && 'FOOTBALL_API_KEY',
    ].filter(Boolean).join(', ')
    console.error('[poll-scores] Missing env vars:', missing)
    return Response.json({ error: `Missing env vars: ${missing}` }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ── Fetch from football-data.org ─────────────────────────────────────────
  let apiResponse: Response
  try {
    apiResponse = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': apiKey },
    })
  } catch (err) {
    console.error('[poll-scores] Network error fetching API:', err)
    return Response.json({ error: 'Network error fetching API' }, { status: 502 })
  }

  if (apiResponse.status === 429) {
    console.warn('[poll-scores] Rate limited by football-data.org')
    return Response.json({ error: 'Rate limited' }, { status: 429 })
  }

  if (!apiResponse.ok) {
    console.error('[poll-scores] API error:', apiResponse.status)
    return Response.json({ error: `API error: ${apiResponse.status}` }, { status: 502 })
  }

  const { matches }: { matches: ApiMatch[] } = await apiResponse.json()

  // ── Map to DB rows ────────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const rows = matches.map((m) => ({
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
    bookings: (m.bookings ?? []).map((b) => ({
      minute: b.minute ?? 0,
      team: b.team.id === m.homeTeam.id ? 'home' : 'away',
      card: b.card,
      player: b.player?.name ?? null,
    })),
    live_minute: m.minute ?? null,
    updated_at: now,
  }))

  // ── Upsert to Supabase ────────────────────────────────────────────────────
  const { error } = await supabase
    .from('match_results_cache')
    .upsert(rows, { onConflict: 'id' })

  if (error) {
    console.error('[poll-scores] Supabase upsert error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  const liveCount = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED').length
  console.log(`[poll-scores] Upserted ${rows.length} matches (${liveCount} live) at ${now}`)

  return Response.json({ ok: true, total: rows.length, live: liveCount, updatedAt: now })
}

// Runs every minute via Netlify scheduler.
// For sub-minute live updates, use an external cron hitting this URL:
//   https://your-site.netlify.app/.netlify/functions/poll-scores
export const config: Config = {
  schedule: '* * * * *',
}
