/**
 * poll-scores — Netlify Function that fetches WC matches from football-data.org
 * and upserts them into Supabase.
 *
 * Invoke via HTTP GET or POST: /.netlify/functions/poll-scores
 * Set up cron-job.org (free) to hit this URL every 30–60 s for live updates.
 *
 * Required Netlify env vars:
 *   SUPABASE_URL              — same value as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS for writes)
 *   VITE_FOOTBALL_API_KEY     — football-data.org API key
 */

import type { Config, Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

interface ApiTeam { id: number | null; name: string | null; tla: string | null }
interface ApiGoal  { minute: number | string | null; scorer: { name: string } | null; team: { id: number } }
interface ApiBooking { minute: number | string | null; team: { id: number }; card: string; player?: { name: string } | null }
interface ApiMatch {
  id: number; utcDate: string; status: string; stage: string; group: string | null
  score: { fullTime: { home: number | null; away: number | null } }
  minute: number | null; homeTeam: ApiTeam; awayTeam: ApiTeam
  goals: ApiGoal[]; bookings?: ApiBooking[]
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(_req: Request, _context: Context): Promise<Response> {
  const supabaseUrl = process.env['SUPABASE_URL']
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  const apiKey     = process.env['VITE_FOOTBALL_API_KEY']

  if (!supabaseUrl || !supabaseKey || !apiKey) {
    const missing = [
      !supabaseUrl && 'SUPABASE_URL',
      !supabaseKey && 'SUPABASE_SERVICE_ROLE_KEY',
      !apiKey      && 'VITE_FOOTBALL_API_KEY',
    ].filter(Boolean).join(', ')
    console.error('[poll-scores] Missing env vars:', missing)
    return json({ error: `Missing env vars: ${missing}` }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ── Fetch from football-data.org ──────────────────────────────────────────
  let apiRes: Response
  try {
    apiRes = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': apiKey },
    })
  } catch (err) {
    console.error('[poll-scores] Network error:', err)
    return json({ error: 'Network error reaching football-data.org' }, 502)
  }

  if (apiRes.status === 429) {
    return json({ error: 'Rate limited by football-data.org — slow down calls' }, 429)
  }
  if (apiRes.status === 403) {
    const detail = await apiRes.text()
    console.error('[poll-scores] 403 from API:', detail)
    return json({ error: 'football-data.org returned 403 — check API key has WC competition access', detail }, 403)
  }
  if (!apiRes.ok) {
    const detail = await apiRes.text()
    console.error('[poll-scores] API error', apiRes.status, detail)
    return json({ error: `API error ${apiRes.status}`, detail }, 502)
  }

  const payload = await apiRes.json() as { matches?: ApiMatch[] }
  const matches = payload.matches ?? []

  if (matches.length === 0) {
    console.warn('[poll-scores] API returned 0 matches — key may lack WC access')
    return json({ ok: true, total: 0, live: 0, warning: 'API returned 0 matches' })
  }

  // ── Map rows ──────────────────────────────────────────────────────────────
  const now = new Date().toISOString()

  const baseRows = matches.map((m) => ({
    id: m.id,
    home_team: m.homeTeam.name ?? 'TBD',
    away_team: m.awayTeam.name ?? 'TBD',
    home_score: m.score.fullTime.home,
    away_score: m.score.fullTime.away,
    status: m.status === 'TIMED' ? 'SCHEDULED' : m.status,
    stage: m.stage,
    match_group: m.group ?? null,
    utc_date: m.utcDate,
    goals: (m.goals ?? []).map((g) => ({
      scorer: g.scorer?.name ?? null,
      minute: g.minute ?? 0,
      team: m.homeTeam.id !== null && g.team.id === m.homeTeam.id ? 'home' : 'away',
    })),
    live_minute: m.minute ?? null,
    updated_at: now,
  }))

  // ── Upsert — try with bookings column, fall back without ──────────────────
  const rowsWithBookings = baseRows.map((row, i) => ({
    ...row,
    bookings: (matches[i].bookings ?? []).map((b) => ({
      minute: b.minute ?? 0,
      team: matches[i].homeTeam.id !== null && b.team.id === matches[i].homeTeam.id ? 'home' : 'away',
      card: b.card,
      player: b.player?.name ?? null,
    })),
  }))

  const { error: err1 } = await supabase
    .from('match_results_cache')
    .upsert(rowsWithBookings, { onConflict: 'id' })

  if (err1) {
    console.warn('[poll-scores] Upsert with bookings failed, retrying without:', err1.message)
    const { error: err2 } = await supabase
      .from('match_results_cache')
      .upsert(baseRows, { onConflict: 'id' })
    if (err2) {
      console.error('[poll-scores] Supabase upsert error:', err2.message)
      return json({ error: err2.message }, 500)
    }
  }

  const live = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED').length
  console.log(`[poll-scores] OK — ${matches.length} matches (${live} live) at ${now}`)
  return json({ ok: true, total: matches.length, live, updatedAt: now })
}

// Run every minute via Netlify's built-in scheduler (free tier, ~43k calls/month).
// Also callable via HTTP GET /.netlify/functions/poll-scores for manual / cron-job.org use.
export const config: Config = { schedule: '* * * * *' }
