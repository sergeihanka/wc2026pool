/**
 * seed-venues.mjs
 * One-time script: fetches venue for every match in match_results_cache from
 * football-data.org's individual match endpoint (more reliable than the bulk
 * competitions endpoint), then writes it back to Supabase.
 *
 * Usage:
 *   VITE_FOOTBALL_API_KEY=<key> \
 *   SUPABASE_URL=<url> \
 *   SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   node supabase/seed-venues.mjs
 *
 * Respects the free-tier rate limit of 10 req/min by pausing between calls.
 */

import { createClient } from '@supabase/supabase-js'

const API_KEY      = process.env.VITE_FOOTBALL_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars: VITE_FOOTBALL_API_KEY, SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── 1. Load all match IDs from the cache ──────────────────────────────────────
const { data: rows, error: fetchErr } = await sb
  .from('match_results_cache')
  .select('id, home_team, away_team, venue')
  .order('id', { ascending: true })

if (fetchErr) { console.error('Supabase read failed:', fetchErr.message); process.exit(1) }
console.log(`Loaded ${rows.length} matches from DB`)

// ── 2. Filter to matches with no venue yet ────────────────────────────────────
const missing = rows.filter(r => !r.venue)
console.log(`${missing.length} matches missing venue, ${rows.length - missing.length} already set`)

if (missing.length === 0) { console.log('Nothing to do.'); process.exit(0) }

// ── 3. Fetch each match individually from football-data.org ──────────────────
// Free tier: 10 requests/minute → wait 7s between calls to stay safe
const DELAY_MS = 7_000
let updated = 0
let failed  = 0

for (let i = 0; i < missing.length; i++) {
  const row = missing[i]
  process.stdout.write(`[${i + 1}/${missing.length}] Match ${row.id} (${row.home_team} vs ${row.away_team}) ... `)

  let venue = null
  try {
    const res = await fetch(`https://api.football-data.org/v4/matches/${row.id}`, {
      headers: { 'X-Auth-Token': API_KEY },
    })

    if (res.status === 429) {
      console.log('RATE LIMITED — waiting 60s')
      await sleep(60_000)
      i-- // retry same match
      continue
    }

    if (!res.ok) {
      console.log(`HTTP ${res.status} — skipping`)
      failed++
    } else {
      const data = await res.json()
      venue = data.venue ?? null
      if (venue) {
        const { error: upErr } = await sb
          .from('match_results_cache')
          .update({ venue })
          .eq('id', row.id)
        if (upErr) { console.log(`DB write failed: ${upErr.message}`); failed++ }
        else { console.log(`✓ ${venue}`); updated++ }
      } else {
        console.log('venue=null in API response — skipping')
        failed++
      }
    }
  } catch (err) {
    console.log(`Network error: ${err.message}`)
    failed++
  }

  // Rate-limit pause (skip after last item)
  if (i < missing.length - 1) await sleep(DELAY_MS)
}

console.log(`\nDone. Updated: ${updated}  Failed/null: ${failed}`)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
