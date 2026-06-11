import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FootballDataService } from '../FootballDataService'

// ─── API fixture data ─────────────────────────────────────────────────────────

const apiMatchesResponse = {
  matches: [
    {
      id: 123,
      utcDate: '2026-06-11T19:00:00Z',
      status: 'FINISHED' as const,
      stage: 'GROUP_STAGE',
      group: 'Group A',
      score: {
        fullTime: { home: 2, away: 1 },
        halfTime: { home: 1, away: 0 },
      },
      minute: null,
      homeTeam: {
        id: 762,
        name: 'Argentina',
        shortName: 'Argentina',
        tla: 'ARG',
        crest: 'https://crests.football-data.org/762.svg',
      },
      awayTeam: {
        id: 759,
        name: 'Netherlands',
        shortName: 'Netherlands',
        tla: 'NED',
        crest: 'https://crests.football-data.org/759.svg',
      },
      goals: [
        {
          minute: 23,
          scorer: { name: 'L. Messi' },
          team: { id: 762, name: 'Argentina' },
        },
        {
          minute: 65,
          scorer: { name: 'V. van Dijk' },
          team: { id: 759, name: 'Netherlands' },
        },
        {
          minute: 88,
          scorer: { name: 'J. Alvarez' },
          team: { id: 762, name: 'Argentina' },
        },
      ],
    },
    {
      id: 124,
      utcDate: '2026-06-12T16:00:00Z',
      status: 'TIMED' as const,
      stage: 'GROUP_STAGE',
      group: 'Group B',
      score: {
        fullTime: { home: null, away: null },
        halfTime: { home: null, away: null },
      },
      minute: undefined,
      homeTeam: {
        id: 773,
        name: 'France',
        shortName: 'France',
        tla: 'FRA',
        crest: 'https://crests.football-data.org/773.svg',
      },
      awayTeam: {
        id: 799,
        name: 'Croatia',
        shortName: 'Croatia',
        tla: 'CRO',
        crest: 'https://crests.football-data.org/799.svg',
      },
      goals: [],
    },
  ],
}

const apiSingleMatchResponse = {
  id: 123,
  utcDate: '2026-06-11T19:00:00Z',
  status: 'FINISHED' as const,
  stage: 'GROUP_STAGE',
  group: 'Group A',
  score: {
    fullTime: { home: 2, away: 1 },
    halfTime: { home: 1, away: 0 },
  },
  minute: null,
  homeTeam: {
    id: 762,
    name: 'Argentina',
    shortName: 'Argentina',
    tla: 'ARG',
    crest: 'https://crests.football-data.org/762.svg',
  },
  awayTeam: {
    id: 759,
    name: 'Netherlands',
    shortName: 'Netherlands',
    tla: 'NED',
    crest: 'https://crests.football-data.org/759.svg',
  },
  goals: [
    {
      minute: 23,
      scorer: { name: 'L. Messi' },
      team: { id: 762, name: 'Argentina' },
    },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FootballDataService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('getMatches()', () => {
    it('maps the API response correctly to Match[]', async () => {
      vi.stubGlobal('fetch', mockFetch(apiMatchesResponse))

      const service = new FootballDataService()
      const matches = await service.getMatches()

      expect(matches).toHaveLength(2)

      // First match — FINISHED with goals
      const first = matches[0]
      expect(first.id).toBe(123)
      expect(first.status).toBe('FINISHED')
      expect(first.stage).toBe('GROUP_STAGE')
      expect(first.group).toBe('Group A')
      expect(first.utcDate).toBe('2026-06-11T19:00:00Z')
      expect(first.homeScore).toBe(2)
      expect(first.awayScore).toBe(1)
      expect(first.minute).toBeNull()

      // Home team
      expect(first.homeTeam.id).toBe(762)
      expect(first.homeTeam.name).toBe('Argentina')
      expect(first.homeTeam.shortCode).toBe('ARG')
      expect(first.homeTeam.crest).toBe('https://crests.football-data.org/762.svg')

      // Away team
      expect(first.awayTeam.id).toBe(759)
      expect(first.awayTeam.name).toBe('Netherlands')
      expect(first.awayTeam.shortCode).toBe('NED')

      // Goals — home/away derived from team.id vs homeTeam.id
      expect(first.goals).toHaveLength(3)
      expect(first.goals[0]).toMatchObject({ scorer: 'L. Messi', minute: 23, team: 'home' })
      expect(first.goals[1]).toMatchObject({ scorer: 'V. van Dijk', minute: 65, team: 'away' })
      expect(first.goals[2]).toMatchObject({ scorer: 'J. Alvarez', minute: 88, team: 'home' })
    })

    it('maps TIMED status to SCHEDULED', async () => {
      vi.stubGlobal('fetch', mockFetch(apiMatchesResponse))

      const service = new FootballDataService()
      const matches = await service.getMatches()

      const timedMatch = matches[1]
      expect(timedMatch.status).toBe('SCHEDULED')
      expect(timedMatch.homeScore).toBeNull()
      expect(timedMatch.awayScore).toBeNull()
      expect(timedMatch.goals).toHaveLength(0)
    })

    it('throws a RATE_LIMIT error on 429 response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          json: vi.fn(),
        }),
      )

      const service = new FootballDataService()

      await expect(service.getMatches()).rejects.toMatchObject({
        code: 'RATE_LIMIT',
        name: 'FootballDataError',
      })
    })

    it('throws a generic HTTP error on non-200, non-429 response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          json: vi.fn(),
        }),
      )

      const service = new FootballDataService()

      await expect(service.getMatches()).rejects.toMatchObject({
        code: 'HTTP_503',
        name: 'FootballDataError',
      })
    })
  })

  describe('getMatch(id)', () => {
    it('maps a single match correctly', async () => {
      vi.stubGlobal('fetch', mockFetch(apiSingleMatchResponse))

      const service = new FootballDataService()
      const match = await service.getMatch(123)

      expect(match.id).toBe(123)
      expect(match.homeTeam.shortCode).toBe('ARG')
      expect(match.awayTeam.shortCode).toBe('NED')
      expect(match.homeScore).toBe(2)
      expect(match.awayScore).toBe(1)
      expect(match.status).toBe('FINISHED')
      expect(match.goals).toHaveLength(1)
      expect(match.goals[0]).toMatchObject({ scorer: 'L. Messi', minute: 23, team: 'home' })
    })

    it('throws RATE_LIMIT on 429 for single match', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          json: vi.fn(),
        }),
      )

      const service = new FootballDataService()

      await expect(service.getMatch(123)).rejects.toMatchObject({
        code: 'RATE_LIMIT',
      })
    })
  })
})
