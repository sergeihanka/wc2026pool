import type { Match, Goal, Booking, LeaderboardRow, PoolMember } from '@/types'
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
  bookings: Booking[] | null
  live_minute: number | null
  updated_at: string
}

// Maps full team names (as stored by PollingService) to FIFA short codes.
// Covers all 48 WC 2026 teams + common extras — falls back to first 3 chars.
const TEAM_SHORT_CODES: Record<string, string> = {
  // Pool teams
  Argentina: 'ARG',
  Netherlands: 'NED',
  France: 'FRA',
  Croatia: 'CRO',
  Spain: 'ESP',
  USA: 'USA',
  'United States': 'USA',
  Portugal: 'POR',
  Switzerland: 'SUI',
  England: 'ENG',
  Morocco: 'MAR',
  Brazil: 'BRA',
  Uruguay: 'URU',

  // Europe
  Germany: 'GER',
  Italy: 'ITA',
  Belgium: 'BEL',
  Denmark: 'DEN',
  Sweden: 'SWE',
  Norway: 'NOR',
  Austria: 'AUT',
  Serbia: 'SRB',
  Romania: 'ROU',
  Turkey: 'TUR',
  Türkiye: 'TUR',
  Ukraine: 'UKR',
  Greece: 'GRE',
  Scotland: 'SCO',
  Wales: 'WAL',
  Ireland: 'IRL',
  Hungary: 'HUN',
  Czechia: 'CZE',
  'Czech Republic': 'CZE',
  Slovakia: 'SVK',
  Slovenia: 'SVN',
  Poland: 'POL',
  Albania: 'ALB',
  Georgia: 'GEO',
  Iceland: 'ISL',
  Finland: 'FIN',
  'North Macedonia': 'MKD',
  Bosnia: 'BIH',
  'Bosnia and Herzegovina': 'BIH',
  Montenegro: 'MNE',
  Luxembourg: 'LUX',
  Kosovo: 'XKX',

  // CONCACAF
  Mexico: 'MEX',
  Canada: 'CAN',
  'Costa Rica': 'CRC',
  Panama: 'PAN',
  Jamaica: 'JAM',
  Honduras: 'HON',
  'El Salvador': 'SLV',
  Haiti: 'HAI',
  'Trinidad and Tobago': 'TRI',
  Cuba: 'CUB',
  Guatemala: 'GUA',
  'Curaçao': 'CUW',

  // South America
  Colombia: 'COL',
  Ecuador: 'ECU',
  Peru: 'PER',
  Chile: 'CHI',
  Venezuela: 'VEN',
  Bolivia: 'BOL',
  Paraguay: 'PAR',

  // Africa
  Nigeria: 'NGA',
  Senegal: 'SEN',
  Cameroon: 'CMR',
  Egypt: 'EGY',
  'South Africa': 'RSA',
  Tunisia: 'TUN',
  Algeria: 'ALG',
  "Côte d'Ivoire": 'CIV',
  'Ivory Coast': 'CIV',
  Mali: 'MLI',
  Ghana: 'GHA',
  'DR Congo': 'COD',
  'Democratic Republic of Congo': 'COD',
  Ethiopia: 'ETH',
  Mozambique: 'MOZ',
  Zambia: 'ZAM',
  Tanzania: 'TAN',
  Uganda: 'UGA',
  Angola: 'ANG',
  Zimbabwe: 'ZIM',
  Comoros: 'COM',
  'Burkina Faso': 'BFA',
  Gabon: 'GAB',
  Kenya: 'KEN',

  // Asia
  Japan: 'JPN',
  'South Korea': 'KOR',
  Korea: 'KOR',
  'Saudi Arabia': 'KSA',
  Iran: 'IRN',
  China: 'CHN',
  Indonesia: 'IDN',
  Qatar: 'QAT',
  Australia: 'AUS',
  'New Zealand': 'NZL',
  Uzbekistan: 'UZB',
  Jordan: 'JOR',
  Bahrain: 'BHR',
  Kuwait: 'KUW',
  Oman: 'OMA',
  Iraq: 'IRQ',
  Palestine: 'PLE',
  'United Arab Emirates': 'UAE',
  UAE: 'UAE',
  Thailand: 'THA',
  Vietnam: 'VIE',
  Kyrgyzstan: 'KGZ',
  Tajikistan: 'TJK',
}

function resolveShortCode(name: string): string {
  return TEAM_SHORT_CODES[name] ?? name.slice(0, 3).toUpperCase()
}

// ─── Mapping from DB row → Match ──────────────────────────────────────────────

function dbRowToMatch(row: MatchDbRow): Match {
  return {
    id: row.id,
    homeTeam: {
      id: 0,
      name: row.home_team,
      shortCode: resolveShortCode(row.home_team),
    },
    awayTeam: {
      id: 0,
      name: row.away_team,
      shortCode: resolveShortCode(row.away_team),
    },
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status as Match['status'],
    utcDate: row.utc_date,
    stage: row.stage,
    group: row.match_group ?? undefined,
    goals: row.goals ?? [],
    bookings: row.bookings ?? [],
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

        if (!tied) currentRank = i + 1
        curr.rank = currentRank
      }
    }

    return rows
  }
}

// ─── Per-member computation ───────────────────────────────────────────────────

function computeMemberRow(member: PoolMember, finishedMatches: Match[]): LeaderboardRow {
  let played = 0, won = 0, drawn = 0, lost = 0, points = 0
  let goalsFor = 0, goalsAgainst = 0
  let yellowCards = 0, redCards = 0

  for (const match of finishedMatches) {
    const homeCode = match.homeTeam.shortCode
    const awayCode = match.awayTeam.shortCode

    const memberIsHome = member.teams.includes(homeCode)
    const memberIsAway = member.teams.includes(awayCode)

    if (!memberIsHome && !memberIsAway) continue

    const homeScore = match.homeScore ?? 0
    const awayScore = match.awayScore ?? 0

    played++

    if (memberIsHome) {
      goalsFor += homeScore
      goalsAgainst += awayScore
      if (homeScore > awayScore) { won++; points += 3 }
      else if (homeScore === awayScore) { drawn++; points += 1 }
      else { lost++ }
    } else {
      goalsFor += awayScore
      goalsAgainst += homeScore
      if (awayScore > homeScore) { won++; points += 3 }
      else if (awayScore === homeScore) { drawn++; points += 1 }
      else { lost++ }
    }

    // Count cards for the member's team
    const memberSide = memberIsHome ? 'home' : 'away'
    for (const b of match.bookings ?? []) {
      if (b.team !== memberSide) continue
      if (b.card === 'YELLOW') yellowCards++
      else if (b.card === 'RED' || b.card === 'YELLOW_RED') redCards++
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
    yellowCards,
    redCards,
    rank: 0,
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const poolService = new PoolService()
