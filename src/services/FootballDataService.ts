import type { Match, Team, Goal, Booking, MatchStatus } from '@/types'
import type { IScoreService } from './IScoreService'
import { FOOTBALL_API_KEY, FOOTBALL_API_BASE_URL } from '@/config/env'

// ─── API response shapes (football-data.org v4) ──────────────────────────────

interface ApiTeam {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

interface ApiScore {
  fullTime: { home: number | null; away: number | null }
  halfTime: { home: number | null; away: number | null }
}

interface ApiGoal {
  minute: number | string | null
  scorer: { name: string } | null
  team: { id: number; name: string }
}

interface ApiBooking {
  minute: number | string | null
  team: { id: number; name: string }
  card: 'YELLOW' | 'RED' | 'YELLOW_RED'
  player?: { name: string } | null
}

type ApiMatchStatus =
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'SUSPENDED'

interface ApiMatch {
  id: number
  utcDate: string
  status: ApiMatchStatus
  stage: string
  group: string | null
  score: ApiScore
  minute: number | null | undefined
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  goals: ApiGoal[]
  bookings?: ApiBooking[]
}

interface ApiMatchesResponse {
  matches: ApiMatch[]
}

interface ApiSingleMatchResponse extends ApiMatch {}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapStatus(apiStatus: ApiMatchStatus): MatchStatus {
  if (apiStatus === 'TIMED') return 'SCHEDULED'
  return apiStatus as MatchStatus
}

function mapTeam(apiTeam: ApiTeam): Team {
  return {
    id: apiTeam.id,
    name: apiTeam.name,
    shortCode: apiTeam.tla,
    crest: apiTeam.crest,
  }
}

function mapGoals(apiGoals: ApiGoal[], homeTeamId: number): Goal[] {
  return apiGoals.map((g) => ({
    scorer: g.scorer?.name ?? null,
    minute: g.minute ?? 0,
    team: g.team.id === homeTeamId ? 'home' : 'away',
  }))
}

function mapBookings(apiBookings: ApiBooking[] | undefined, homeTeamId: number): Booking[] {
  if (!apiBookings) return []
  return apiBookings.map((b) => ({
    minute: b.minute ?? 0,
    team: b.team.id === homeTeamId ? 'home' : 'away',
    card: b.card,
    player: b.player?.name ?? null,
  }))
}

function mapMatch(apiMatch: ApiMatch): Match {
  return {
    id: apiMatch.id,
    homeTeam: mapTeam(apiMatch.homeTeam),
    awayTeam: mapTeam(apiMatch.awayTeam),
    homeScore: apiMatch.score.fullTime.home,
    awayScore: apiMatch.score.fullTime.away,
    status: mapStatus(apiMatch.status),
    utcDate: apiMatch.utcDate,
    stage: apiMatch.stage,
    group: apiMatch.group ?? undefined,
    goals: mapGoals(apiMatch.goals ?? [], apiMatch.homeTeam.id),
    bookings: mapBookings(apiMatch.bookings, apiMatch.homeTeam.id),
    minute: apiMatch.minute ?? null,
  }
}

// ─── Error helpers ────────────────────────────────────────────────────────────

class FootballDataError extends Error {
  readonly code: string
  readonly status?: number

  constructor(message: string, code: string, status?: number) {
    super(message)
    this.name = 'FootballDataError'
    this.code = code
    this.status = status
  }
}

async function handleResponse(response: Response, url: string): Promise<unknown> {
  if (response.status === 429) {
    throw new FootballDataError(
      `Rate limit exceeded calling ${url}. Back off and retry.`,
      'RATE_LIMIT',
      429,
    )
  }
  if (!response.ok) {
    throw new FootballDataError(
      `football-data.org returned HTTP ${response.status} for ${url}`,
      `HTTP_${response.status}`,
      response.status,
    )
  }
  return response.json()
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class FootballDataService implements IScoreService {
  private readonly baseUrl: string
  private readonly headers: Record<string, string>

  constructor() {
    this.baseUrl = FOOTBALL_API_BASE_URL
    this.headers = {
      'X-Auth-Token': FOOTBALL_API_KEY,
    }
  }

  async getMatches(): Promise<Match[]> {
    const url = `${this.baseUrl}/competitions/WC/matches`
    const response = await fetch(url, { headers: this.headers })
    const data = (await handleResponse(response, url)) as ApiMatchesResponse
    return data.matches.map(mapMatch)
  }

  async getMatch(id: number): Promise<Match> {
    const url = `${this.baseUrl}/matches/${id}`
    const response = await fetch(url, { headers: this.headers })
    const data = (await handleResponse(response, url)) as ApiSingleMatchResponse
    return mapMatch(data)
  }
}
