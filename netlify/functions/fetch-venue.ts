/**
 * fetch-venue — fetches the venue for a single match from football-data.org
 * and writes it into match_results_cache (requires service role key for the write).
 *
 * GET /.netlify/functions/fetch-venue?matchId=123
 * Returns: { venue: string | null }
 */

import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

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

  // Fetch venue from football-data.org individual match endpoint
  let venue: string | null = null
  try {
    const apiRes = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
      headers: { 'X-Auth-Token': apiKey },
    })
    if (apiRes.status === 429) return json({ error: 'rate_limited' }, 429)
    if (apiRes.ok) {
      const data = await apiRes.json() as { venue?: string | null }
      venue = data.venue ?? null
    }
  } catch (err) {
    console.error('[fetch-venue] API error:', err)
    return json({ error: 'network error' }, 502)
  }

  // Write venue to DB (even if null — records that we tried)
  if (venue !== null) {
    const sb = createClient(supabaseUrl, supabaseKey)
    const { error } = await sb
      .from('match_results_cache')
      .update({ venue })
      .eq('id', Number(matchId))
    if (error) console.error('[fetch-venue] DB write error:', error.message)
  }

  return json({ venue })
}
