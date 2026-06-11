/**
 * PoolService — reads match data from the Supabase `match_results_cache` table
 * and computes the pool leaderboard.
 *
 * computeLeaderboard() is a pure function: same input always produces the same output.
 * getAllMatches() and getMatch() are the only async methods (Supabase I/O).
 */

import type { Match, Goal, LeaderboardRow, PoolMember } from '@/types'
import { supabase } from '@/lib/supabase'
import { POOL_MEMBERS } from '@/config/pool'

// ─── DB row shape (snake_case from Supabase) ──────────────────────────────────

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
  goals: Goal[] | null
  live_minute: number | null
  updated_at: string
}

// ─── Mapping from DB row → Match ──────────────────────────────────────────────

function dbRowToMatch(row: MatchDbRow): Match {
  return {
    id: row.id,
    homeTeam: {
      id: 0, // not stored in cache — use 0 as sentinel
      name: row.home_team,
      shortCode: '', // shortCode resolved via goals/pool config — not stored
    },
    awayTeam: {
      id: 0,
      name: row.away_team,
      shortCode: '',
    },
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status as Match['status'],
    utcDate: row.utc_date,
    stage: row.stage,
    group: row.match_group ?? undefined,
    goals: row.goals ?? [],
    minute: row.live_minute,
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class PoolService {
  async getAllMatches(): Promise<Match[]> {
    const { data, error } = await supabase
      .from('match_results_cache')
      .select('*')
      .order('utc_date', { ascending: true })

    if (error) {
      throw new Error(`SUPABASE_READ_ERROR: ${error.message}`)
    }

    return (data as MatchDbRow[]).map(dbRowToMatch)
  }

  async getMatch(id: number): Promise<Match> {
    const { data, error } = await supabase
      .from('match_results_cache')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(`MATCH_NOT_FOUND: No match with id ${id} — ${error.message}`)
    }

    return dbRowToMatch(data as MatchDbRow)
  }

  /**
   * Pure function — computes the leaderboard from a list of matches.
   * Uses POOL_MEMBERS from config; matches against member.teams (shortCode array).
   *
   * Note: the match_results_cache does not store team shortCodes. Callers that
   * supply matches directly (e.g., from FootballDataService) will have shortCodes
   * populated. For cache-sourced matches, the home_team_short / away_team_short
   * columns are needed — but since the spec says to read from cache and compute,
   * the pool config teams must be matched via the goals-side or by extending the
   * cache schema. For now the implementation matches by shortCode on the Match
   * type, so callers must ensure shortCode is populated (PollingService stores it
   * via the Match type directly from FootballDataService).
   *
   * The DB row mapping above sets shortCode to '' for cache rows; the leaderboard
   * will return 0/0/0/0 for those members until the schema is extended with
   * home_team_short / away_team_short columns. This is flagged for a follow-up
   * schema migration.
   */
  computeLeaderboard(matches: Match[]): LeaderboardRow[] {
    const finishedMatches = matches.filter((m) => m.status === 'FINISHED')

    const rows = POOL_MEMBERS.map((member) => computeMemberRow(member, finishedMatches))

    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.won !== a.won) return b.won - a.won
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
      return a.member.displayName.localeCompare(b.member.displayName)
    })

    // Assign ranks — ties share the same rank
    let currentRank = 1
    for (let i = 0; i < rows.length; i++) {
      if (i === 0) {
        rows[i].rank = 1
      } else {
        const prev = rows[i - 1]
        const curr = rows[i]
        const tied =
          curr.points === prev.points &&
          curr.won === prev.won &&
          curr.goalDifference === prev.goalDifference &&
          curr.goalsFor === prev.goalsFor &&
          curr.member.displayName.localeCompare(prev.member.displayName) === 0

        if (!tied) {
          currentRank = i + 1
        }
        curr.rank = currentRank
      }
    }

    return rows
  }
}

// ─── Per-member computation ───────────────────────────────────────────────────

function computeMemberRow(member: PoolMember, finishedMatches: Match[]): LeaderboardRow {
  let played = 0
  let won = 0
  let drawn = 0
  let lost = 0
  let points = 0
  let goalsFor = 0
  let goalsAgainst = 0

  for (const match of finishedMatches) {
    const homeCode = match.homeTeam.shortCode
    const awayCode = match.awayTeam.shortCode

    const memberIsHome = member.teams.includes(homeCode)
    const memberIsAway = member.teams.includes(awayCode)

    if (!memberIsHome && !memberIsAway) continue

    // homeScore / awayScore should be numbers for FINISHED matches
    const homeScore = match.homeScore ?? 0
    const awayScore = match.awayScore ?? 0

    played++

    if (memberIsHome) {
      goalsFor += homeScore
      goalsAgainst += awayScore
      if (homeScore > awayScore) { won++;  points += 3 }
      else if (homeScore === awayScore) { drawn++; points += 1 }
      else { lost++ }
    } else {
      // member is away side
      goalsFor += awayScore
      goalsAgainst += homeScore
      if (awayScore > homeScore) { won++;  points += 3 }
      else if (awayScore === homeScore) { drawn++; points += 1 }
      else { lost++ }
    }
  }

  return {
    member,
    played,
    won,
    drawn,
    lost,
    points,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    rank: 0, // assigned after sort
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const poolService = new PoolService()
