export type MatchStatus =
  | 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED'
  | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'SUSPENDED'

export interface Team {
  id: number           // football-data.org internal ID
  name: string
  shortCode: string    // FIFA 3-letter code e.g. "ARG"
  crest?: string       // URL from API (may not be used — we bundle flags locally)
}

export interface Goal {
  scorer: string | null
  minute: number | string  // can be "45+2" format
  team: 'home' | 'away'
}

export interface Booking {
  minute: number | string
  team: 'home' | 'away'
  card: 'YELLOW' | 'RED' | 'YELLOW_RED'
  player: string | null
}

export interface Match {
  id: number
  homeTeam: Team
  awayTeam: Team
  homeScore: number | null
  awayScore: number | null
  status: MatchStatus
  utcDate: string     // ISO8601
  stage: string       // e.g. "GROUP_STAGE", "ROUND_OF_16"
  group?: string      // e.g. "Group A"
  goals: Goal[]
  bookings: Booking[]
  minute?: number | null   // live match minute
  venue?: string      // stadium name from API
}

export interface PoolMember {
  id: string             // e.g. "sergei_hanka"
  displayName: string
  teams: string[]        // FIFA short codes, exactly 2
  avatarInitials: string // e.g. "SH"
  color: string          // member's UI color e.g. "#1976D2"
}

export interface LeaderboardRow {
  member: PoolMember
  played: number
  won: number
  drawn: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  yellowCards: number
  redCards: number
  rank: number
}

export interface SessionData {
  memberId: string
  expiresAt: number   // Unix timestamp ms
}

export interface PushSubscriptionRecord {
  id?: string
  memberId: string
  oneSignalPlayerId: string
  teams: string[]
  enabled: boolean
  createdAt?: string
}

export interface NotificationLogEntry {
  id?: string
  matchId: number
  type: string          // 'kickoff' | 'goal:{minute}:{scorer}'
  sentAt?: string
  payload?: Record<string, unknown>
}
