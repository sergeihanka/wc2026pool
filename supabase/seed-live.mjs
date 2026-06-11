/**
 * seed-live.mjs — run this locally to populate the Supabase DB with live WC data.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   FOOTBALL_API_KEY=abc123 \
 *   node supabase/seed-live.mjs
 *
 * Or set the vars in a .env.local file and use:
 *   node --env-file=.env.local supabase/seed-live.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const API_KEY = process.env.FOOTBALL_API_KEY || process.env.VITE_FOOTBALL_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
  console.error('Missing env vars. Need: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FOOTBALL_API_KEY (or VITE_ prefixed versions)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('Fetching WC matches from football-data.org...')
const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
  headers: { 'X-Auth-Token': API_KEY },
})

if (!res.ok) {
  const body = await res.text()
  console.error(`API error ${res.status}:`, body)
  process.exit(1)
}

const { matches } = await res.json()
console.log(`Got ${matches.length} matches. Live: ${matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED').length}`)

if (matches.length === 0) {
  console.warn('⚠️  API returned 0 matches. Your API key may not have WC 2026 access.')
  console.warn('   Check: https://www.football-data.org/client — look for "FIFA World Cup 2026" in your available competitions.')
  process.exit(1)
}

const now = new Date().toISOString()
const rows = matches.map(m => ({
  id: m.id,
  home_team: m.homeTeam?.name ?? 'TBD',
  away_team: m.awayTeam?.name ?? 'TBD',
  home_score: m.score.fullTime.home,
  away_score: m.score.fullTime.away,
  status: m.status === 'TIMED' ? 'SCHEDULED' : m.status,
  stage: m.stage,
  match_group: m.group ?? null,
  utc_date: m.utcDate,
  goals: (m.goals ?? []).map(g => ({
    scorer: g.scorer?.name ?? null,
    minute: g.minute ?? 0,
    team: m.homeTeam?.id != null && g.team.id === m.homeTeam.id ? 'home' : 'away',
  })),
  live_minute: m.minute ?? null,
  updated_at: now,
}))

console.log('Upserting to Supabase...')
const { error } = await supabase.from('match_results_cache').upsert(rows, { onConflict: 'id' })

if (error) {
  console.error('Supabase error:', error.message)
  process.exit(1)
}

console.log(`✅ Seeded ${rows.length} matches into match_results_cache`)
