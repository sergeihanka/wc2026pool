/**
 * seed-mock.mjs — Populates match_results_cache with realistic WC 2026 data.
 * Scenario: halfway through group stage — MD1+MD2 complete, MD3 starting.
 *
 * Usage: node supabase/seed-mock.mjs
 * Reads credentials from local-env/databases/supabase.env
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function parseEnvFile(filePath) {
  try {
    const env = {}
    for (const line of readFileSync(filePath, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 0) continue
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
    }
    return env
  } catch { return {} }
}

const env = parseEnvFile(join(__dirname, '../local-env/databases/supabase.env'))
const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const now = new Date().toISOString()

// ── Pool members for reference ──────────────────────────────────────────────
// Sergei:  ARG + NED   Matt:    FRA + CRO   Jacob:   ESP + USA
// Charlie: POR + SUI   Luke:    ENG + MAR   Micah:   BRA + URU

const matches = [
  // ── GROUP A: Argentina · Morocco · Germany · Mexico ─────────────────────
  // MD1
  { id: 1,
    home_team: 'Argentina',  away_team: 'Germany',
    home_score: 3, away_score: 0, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group A',
    utc_date: '2026-06-12T15:00:00Z',
    goals: [
      { minute: 22, scorer: 'L. Messi',    team: 'home' },
      { minute: 45, scorer: 'Á. Di María', team: 'home' },
      { minute: 78, scorer: 'J. Álvarez',  team: 'home' },
    ], live_minute: null, updated_at: now },

  { id: 2,
    home_team: 'Morocco', away_team: 'Mexico',
    home_score: 1, away_score: 1, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group A',
    utc_date: '2026-06-12T18:00:00Z',
    goals: [
      { minute: 34, scorer: 'H. Ziyech',  team: 'home' },
      { minute: 67, scorer: 'H. Lozano',  team: 'away' },
    ], live_minute: null, updated_at: now },

  // MD2
  { id: 3,
    home_team: 'Argentina', away_team: 'Mexico',
    home_score: 2, away_score: 1, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group A',
    utc_date: '2026-06-17T15:00:00Z',
    goals: [
      { minute: 33, scorer: 'L. Messi',   team: 'home' },
      { minute: 55, scorer: 'H. Lozano',  team: 'away' },
      { minute: 67, scorer: 'J. Álvarez', team: 'home' },
    ], live_minute: null, updated_at: now },

  { id: 4,
    home_team: 'Germany', away_team: 'Morocco',
    home_score: 3, away_score: 1, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group A',
    utc_date: '2026-06-17T18:00:00Z',
    goals: [
      { minute: 12, scorer: 'T. Müller',      team: 'home' },
      { minute: 44, scorer: 'T. Werner',       team: 'home' },
      { minute: 65, scorer: 'Y. En-Nesyri',   team: 'away' },
      { minute: 81, scorer: 'K. Havertz',      team: 'home' },
    ], live_minute: null, updated_at: now },

  // MD3 — in progress!
  { id: 5,
    home_team: 'Argentina', away_team: 'Morocco',
    home_score: 1, away_score: 0, status: 'IN_PLAY',
    stage: 'GROUP_STAGE', match_group: 'Group A',
    utc_date: '2026-06-22T18:00:00Z',
    goals: [
      { minute: 34, scorer: 'L. Messi', team: 'home' },
    ], live_minute: 67, updated_at: now },

  { id: 6,
    home_team: 'Germany', away_team: 'Mexico',
    home_score: null, away_score: null, status: 'SCHEDULED',
    stage: 'GROUP_STAGE', match_group: 'Group A',
    utc_date: '2026-06-22T18:00:00Z',
    goals: [], live_minute: null, updated_at: now },

  // ── GROUP B: Netherlands · USA · Poland · Senegal ───────────────────────
  // MD1
  { id: 7,
    home_team: 'Netherlands', away_team: 'Poland',
    home_score: 2, away_score: 0, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group B',
    utc_date: '2026-06-13T15:00:00Z',
    goals: [
      { minute: 34, scorer: 'C. Gakpo',    team: 'home' },
      { minute: 67, scorer: 'D. Dumfries', team: 'home' },
    ], live_minute: null, updated_at: now },

  { id: 8,
    home_team: 'USA', away_team: 'Senegal',
    home_score: 1, away_score: 1, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group B',
    utc_date: '2026-06-13T18:00:00Z',
    goals: [
      { minute: 55, scorer: 'C. Pulisic', team: 'home' },
      { minute: 78, scorer: 'P. Sarr',    team: 'away' },
    ], live_minute: null, updated_at: now },

  // MD2
  { id: 9,
    home_team: 'Netherlands', away_team: 'USA',
    home_score: 1, away_score: 1, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group B',
    utc_date: '2026-06-18T18:00:00Z',
    goals: [
      { minute: 23, scorer: 'C. Gakpo', team: 'home' },
      { minute: 89, scorer: 'Y. Musah', team: 'away' },
    ], live_minute: null, updated_at: now },

  { id: 10,
    home_team: 'Poland', away_team: 'Senegal',
    home_score: 0, away_score: 2, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group B',
    utc_date: '2026-06-18T15:00:00Z',
    goals: [
      { minute: 12, scorer: 'I. Sarr', team: 'away' },
      { minute: 77, scorer: 'P. Sarr', team: 'away' },
    ], live_minute: null, updated_at: now },

  // MD3
  { id: 11,
    home_team: 'Netherlands', away_team: 'Senegal',
    home_score: null, away_score: null, status: 'SCHEDULED',
    stage: 'GROUP_STAGE', match_group: 'Group B',
    utc_date: '2026-06-23T15:00:00Z',
    goals: [], live_minute: null, updated_at: now },

  { id: 12,
    home_team: 'USA', away_team: 'Poland',
    home_score: null, away_score: null, status: 'SCHEDULED',
    stage: 'GROUP_STAGE', match_group: 'Group B',
    utc_date: '2026-06-23T15:00:00Z',
    goals: [], live_minute: null, updated_at: now },

  // ── GROUP C: France · England · Australia · Japan ────────────────────────
  // MD1
  { id: 13,
    home_team: 'France', away_team: 'Australia',
    home_score: 3, away_score: 1, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group C',
    utc_date: '2026-06-14T15:00:00Z',
    goals: [
      { minute: 15, scorer: 'K. Mbappé',   team: 'home' },
      { minute: 56, scorer: 'K. Mbappé',   team: 'home' },
      { minute: 72, scorer: 'M. Leckie',   team: 'away' },
      { minute: 88, scorer: 'A. Griezmann', team: 'home' },
    ], live_minute: null, updated_at: now },

  { id: 14,
    home_team: 'England', away_team: 'Japan',
    home_score: 2, away_score: 0, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group C',
    utc_date: '2026-06-14T18:00:00Z',
    goals: [
      { minute: 23, scorer: 'J. Bellingham', team: 'home' },
      { minute: 67, scorer: 'H. Kane',        team: 'home' },
    ], live_minute: null, updated_at: now },

  // MD2 — France 0-1 England (pool clash!)
  { id: 15,
    home_team: 'France', away_team: 'England',
    home_score: 0, away_score: 1, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group C',
    utc_date: '2026-06-19T18:00:00Z',
    goals: [
      { minute: 77, scorer: 'P. Foden', team: 'away' },
    ], live_minute: null, updated_at: now },

  { id: 16,
    home_team: 'Japan', away_team: 'Australia',
    home_score: 2, away_score: 0, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group C',
    utc_date: '2026-06-19T15:00:00Z',
    goals: [
      { minute: 34, scorer: 'D. Ito',   team: 'home' },
      { minute: 78, scorer: 'R. Doan',  team: 'home' },
    ], live_minute: null, updated_at: now },

  // MD3
  { id: 17,
    home_team: 'France', away_team: 'Japan',
    home_score: null, away_score: null, status: 'SCHEDULED',
    stage: 'GROUP_STAGE', match_group: 'Group C',
    utc_date: '2026-06-24T15:00:00Z',
    goals: [], live_minute: null, updated_at: now },

  { id: 18,
    home_team: 'England', away_team: 'Australia',
    home_score: null, away_score: null, status: 'SCHEDULED',
    stage: 'GROUP_STAGE', match_group: 'Group C',
    utc_date: '2026-06-24T18:00:00Z',
    goals: [], live_minute: null, updated_at: now },

  // ── GROUP D: Spain · Switzerland · Brazil · Uruguay ──────────────────────
  // MD1 — ESP 4-0 SUI (brutal for Charlie!) and BRA 2-1 URU (pool clash!)
  { id: 19,
    home_team: 'Spain', away_team: 'Switzerland',
    home_score: 4, away_score: 0, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group D',
    utc_date: '2026-06-15T15:00:00Z',
    goals: [
      { minute: 11, scorer: 'Pedri',       team: 'home' },
      { minute: 34, scorer: 'L. Yamal',    team: 'home' },
      { minute: 67, scorer: 'A. Morata',   team: 'home' },
      { minute: 89, scorer: 'N. Williams', team: 'home' },
    ], live_minute: null, updated_at: now },

  { id: 20,
    home_team: 'Brazil', away_team: 'Uruguay',
    home_score: 2, away_score: 1, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group D',
    utc_date: '2026-06-15T18:00:00Z',
    goals: [
      { minute: 28, scorer: 'Vinicius Jr.', team: 'home' },
      { minute: 45, scorer: 'D. Núñez',     team: 'away' },
      { minute: 61, scorer: 'Rodrygo',       team: 'home' },
    ], live_minute: null, updated_at: now },

  // MD2 — ESP 1-1 BRA (pool clash!) and URU 2-0 SUI
  { id: 21,
    home_team: 'Spain', away_team: 'Brazil',
    home_score: 1, away_score: 1, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group D',
    utc_date: '2026-06-20T18:00:00Z',
    goals: [
      { minute: 55, scorer: 'A. Morata', team: 'home' },
      { minute: 80, scorer: 'Endrick',   team: 'away' },
    ], live_minute: null, updated_at: now },

  { id: 22,
    home_team: 'Uruguay', away_team: 'Switzerland',
    home_score: 2, away_score: 0, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group D',
    utc_date: '2026-06-20T15:00:00Z',
    goals: [
      { minute: 22, scorer: 'D. Núñez',    team: 'home' },
      { minute: 78, scorer: 'F. Valverde', team: 'home' },
    ], live_minute: null, updated_at: now },

  // MD3
  { id: 23,
    home_team: 'Spain', away_team: 'Uruguay',
    home_score: null, away_score: null, status: 'SCHEDULED',
    stage: 'GROUP_STAGE', match_group: 'Group D',
    utc_date: '2026-06-25T15:00:00Z',
    goals: [], live_minute: null, updated_at: now },

  { id: 24,
    home_team: 'Brazil', away_team: 'Switzerland',
    home_score: null, away_score: null, status: 'SCHEDULED',
    stage: 'GROUP_STAGE', match_group: 'Group D',
    utc_date: '2026-06-25T18:00:00Z',
    goals: [], live_minute: null, updated_at: now },

  // ── GROUP E: Portugal · Croatia · Ghana · South Korea ────────────────────
  // MD1
  { id: 25,
    home_team: 'Portugal', away_team: 'Ghana',
    home_score: 3, away_score: 0, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group E',
    utc_date: '2026-06-12T21:00:00Z',
    goals: [
      { minute:  8, scorer: 'C. Ronaldo',  team: 'home' },
      { minute: 45, scorer: 'C. Ronaldo',  team: 'home' },
      { minute: 67, scorer: 'B. Fernandes', team: 'home' },
    ], live_minute: null, updated_at: now },

  { id: 26,
    home_team: 'Croatia', away_team: 'South Korea',
    home_score: 1, away_score: 1, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group E',
    utc_date: '2026-06-13T21:00:00Z',
    goals: [
      { minute: 55, scorer: 'L. Modrić', team: 'home' },
      { minute: 77, scorer: 'H. Son',    team: 'away' },
    ], live_minute: null, updated_at: now },

  // MD2 — POR 1-1 CRO (pool clash!)
  { id: 27,
    home_team: 'Portugal', away_team: 'Croatia',
    home_score: 1, away_score: 1, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group E',
    utc_date: '2026-06-17T21:00:00Z',
    goals: [
      { minute: 88, scorer: 'I. Perišić',  team: 'away' },
      { minute: 90, scorer: 'C. Ronaldo',  team: 'home' },
    ], live_minute: null, updated_at: now },

  { id: 28,
    home_team: 'Ghana', away_team: 'South Korea',
    home_score: 1, away_score: 2, status: 'FINISHED',
    stage: 'GROUP_STAGE', match_group: 'Group E',
    utc_date: '2026-06-18T21:00:00Z',
    goals: [
      { minute: 12, scorer: 'H. Son',    team: 'away' },
      { minute: 34, scorer: 'M. Kudus',  team: 'home' },
      { minute: 67, scorer: 'J. Hwang',  team: 'away' },
    ], live_minute: null, updated_at: now },

  // MD3
  { id: 29,
    home_team: 'Portugal', away_team: 'South Korea',
    home_score: null, away_score: null, status: 'SCHEDULED',
    stage: 'GROUP_STAGE', match_group: 'Group E',
    utc_date: '2026-06-22T21:00:00Z',
    goals: [], live_minute: null, updated_at: now },

  { id: 30,
    home_team: 'Croatia', away_team: 'Ghana',
    home_score: null, away_score: null, status: 'SCHEDULED',
    stage: 'GROUP_STAGE', match_group: 'Group E',
    utc_date: '2026-06-22T21:00:00Z',
    goals: [], live_minute: null, updated_at: now },
]

const { error } = await supabase
  .from('match_results_cache')
  .upsert(matches, { onConflict: 'id' })

if (error) {
  console.error('Upsert failed:', error.message)
  process.exit(1)
}

console.log(`✓ Seeded ${matches.length} matches (Groups A–E, MD1+MD2 complete, MD3 starting)`)
console.log()
console.log('Expected leaderboard (from finished matches only):')
console.log('  1. Sergei  (ARG 6pts + NED 4pts) = 10pts  W3 D1 GD+6')
console.log('  2. Micah   (BRA 4pts + URU 3pts) =  7pts  W2 D1 GD+2')
console.log('  3. Luke    (ENG 6pts + MAR 1pt)  =  7pts  W2 D1 GD+1')
console.log('  4. Jacob   (ESP 4pts + USA 2pts) =  6pts  W1 D3 GD+4')
console.log('  5. Matt    (FRA 3pts + CRO 2pts) =  5pts  W1 D2 GD+1')
console.log('  6. Charlie (POR 4pts + SUI 0pts) =  4pts  W1 D1 GD−3')
console.log()
console.log('One live match: ARG 1-0 MAR (67\') — Messi 34\'')
