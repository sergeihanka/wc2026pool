/**
 * poll-scores — server-side Netlify Scheduled Function.
 *
 * Fetches all WC matches from football-data.org and upserts into Supabase.
 * Browsers get updates via Supabase Realtime — no API calls from the browser.
 *
 * Schedule: every 1 minute (Netlify free tier minimum).
 * Also accepts HTTP GET/POST for on-demand triggering or manual testing.
 *
 * Required Netlify env vars:
 *   SUPABASE_URL              — same as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS for writes)
 *   VITE_FOOTBALL_API_KEY     — football-data.org API key
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
  const apiKey = process.env['VITE_FOOTBALL_API_KEY']

  if (!supabaseUrl || !supabaseKey || !apiKey) {
    const missing = [
      !supabaseUrl && 'SUPABASE_URL',
      !supabaseKey && 'SUPABASE_SERVICE_ROLE_KEY',
      !apiKey && 'VITE_FOOTBALL_API_KEY',
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
    return Response.json({ error: 'Rate limited by football-data.org' }, { status: 429 })
  }

  if (apiResponse.status === 403) {
    const body = await apiResponse.text()
    console.error('[poll-scores] API returned 403 — check API key permissions:', body)
    return Response.json({ error: 'API key unauthorized (403). Check key has WC competition access.', detail: body }, { status: 403 })
  }

  if (!apiResponse.ok) {
    const body = await apiResponse.text()
    console.error('[poll-scores] API error:', apiResponse.status, body)
    return Response.json({ error: `API error: ${apiResponse.status}`, detail: body }, { status: 502 })
  }

  const payload = await apiResponse.json() as { matches?: ApiMatch[] }
  const matches = payload.matches ?? []

  if (matches.length === 0) {
    console.warn('[poll-scores] API returned 0 matches — competition may not be available on this API key tier')
    return Response.json({ ok: true, total: 0, live: 0, warning: 'No matches returned by API' })
  }

  // ── Map to DB rows ────────────────────────────────────────────────────────
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

  // ── Upsert to Supabase (with bookings, fallback without) ──────────────────
  let upsertError: { message: string } | null = null

  // Try upsert with bookings column first
  const { error: errWith } = await supabase
    .from('match_results_cache')
    .upsert(rowsWithBookings, { onConflict: 'id' })

  if (errWith) {
    console.warn('[poll-scores] Upsert with bookings failed, trying without:', errWith.message)
    // Bookings column may not exist yet — fall back to rows without it
    const { error: errWithout } = await supabase
      .from('match_results_cache')
      .upsert(baseRows, { onConflict: 'id' })
    upsertError = errWithout
  }

  if (upsertError) {
    console.error('[poll-scores] Supabase upsert error:', upsertError)
    return Response.json({ error: upsertError.message }, { status: 500 })
  }

  const liveCount = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED').length
  console.log(`[poll-scores] Upserted ${matches.length} matches (${liveCount} live) at ${now}`)

  return Response.json({ ok: true, total: matches.length, live: liveCount, updatedAt: now })
}

export const config: Config = {
  schedule: '* * * * *',
}
