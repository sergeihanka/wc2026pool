/**
 * fetch-venue — fetches venue AND bookings for a single match from football-data.org
 * (the individual endpoint returns both; the bulk endpoint omits bookings entirely).
 * Saves both fields to match_results_cache and returns them to the client.
 *
 * GET /.netlify/functions/fetch-venue?matchId=123
 * Returns: { venue: string | null, bookings: Booking[] }
 */

import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

interface ApiBooking {
  minute: number | string | null
  team: { id: number }
  card: 'YELLOW' | 'RED' | 'YELLOW_RED'
  player?: { name: string } | null
}

interface ApiTeam { id: number | null }

interface ApiMatchDetail {
  venue?: string | null
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  bookings?: ApiBooking[]
}

interface Booking {
  minute: number | string
  team: 'home' | 'away'
  card: 'YELLOW' | 'RED' | 'YELLOW_RED'
  player: string | null
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

export default async function handler(req: Request, _ctx: Context): Promise<Response> {
  const url = new URL(req.url)
  const matchId = url.searchParams.get('matchId')

  if (!matchId || !/^\d+$/.test(matchId)) {
    return json({ error: 'matchId query param required (numeric)' }, 400)
  }

  const supabaseUrl = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL']
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  const apiKey      = process.env['VITE_FOOTBALL_API_KEY']

  if (!supabaseUrl || !supabaseKey || !apiKey) {
    return json({ error: 'Missing server env vars' }, 500)
  }

  let venue: string | null = null
  let bookings: Booking[] = []

  try {
    const apiRes = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
      headers: { 'X-Auth-Token': apiKey },
    })
    if (apiRes.status === 429) return json({ error: 'rate_limited' }, 429)
    if (!apiRes.ok) return json({ error: `API ${apiRes.status}` }, 502)

    const data = await apiRes.json() as ApiMatchDetail
    venue = data.venue ?? null

    const homeId = data.homeTeam?.id ?? null
    bookings = (data.bookings ?? []).map((b) => ({
      minute: b.minute ?? 0,
      team: (homeId !== null && b.team.id === homeId) ? 'home' : 'away',
      card: b.card,
      player: b.player?.name ?? null,
    }))
  } catch (err) {
    console.error('[fetch-venue] API error:', err)
    return json({ error: 'network error' }, 502)
  }

  // Write both venue and bookings to DB
  const sb = createClient(supabaseUrl, supabaseKey)
  const update: Record<string, unknown> = { bookings }
  if (venue !== null) update.venue = venue

  const { error } = await sb
    .from('match_results_cache')
    .update(update)
    .eq('id', Number(matchId))

  if (error) console.error('[fetch-venue] DB write error:', error.message)

  return json({ venue, bookings })
}
