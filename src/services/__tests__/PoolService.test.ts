/**
 * PoolService unit tests.
 *
 * computeLeaderboard() is a pure function — tests use inline fixtures.
 * getAllMatches() / getMatch() test the Supabase integration via mocks.
 *
 * NOTE on vi.mock hoisting: factories must not reference variables declared
 * in the outer module scope. All mock state is kept inside the factory closure
 * or accessed via the module's __-prefixed exports.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Match, Goal } from '@/types'

// ─── Supabase mock ────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase', () => {
  // All state lives inside the factory to avoid hoisting issues.
  const orderFn  = vi.fn().mockReturnValue({ data: [], error: null })
  const selectFn = vi.fn().mockReturnValue({ order: orderFn })
  const singleFn = vi.fn().mockResolvedValue({ data: null, error: null })
  const eqFn     = vi.fn().mockReturnValue({ single: singleFn })
  const selectForIdFn = vi.fn().mockReturnValue({ eq: eqFn })

  return {
    supabase: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'match_results_cache') {
          return {
            select: selectFn,
          }
        }
        return { select: selectFn }
      }),
    },
    // Expose internals for test control
    __orderFn:  orderFn,
    __selectFn: selectFn,
    __singleFn: singleFn,
    __eqFn:     eqFn,
  }
})

// ─── pool.ts mock — deterministic, small member list ─────────────────────────

vi.mock('@/config/pool', () => ({
  POOL_MEMBERS: [
    { id: 'alice', displayName: 'Alice', teams: ['ARG', 'NED'], avatarInitials: 'AL' },
    { id: 'bob',   displayName: 'Bob',   teams: ['FRA', 'CRO'], avatarInitials: 'BO' },
    { id: 'carol', displayName: 'Carol', teams: ['ESP', 'BRA'], avatarInitials: 'CA' },
    { id: 'dave',  displayName: 'Dave',  teams: ['ENG', 'URU'], avatarInitials: 'DA' },
  ],
  verifyPassword: vi.fn(),
}))

// ─── Import AFTER mocks are registered ───────────────────────────────────────

import { PoolService } from '../PoolService'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeMatch(
  id: number,
  homeCode: string,
  awayCode: string,
  homeScore: number | null,
  awayScore: number | null,
  status: Match['status'],
  goals: Goal[] = [],
): Match {
  return {
    id,
    homeTeam: { id: id * 10,     name: homeCode + ' Team', shortCode: homeCode },
    awayTeam: { id: id * 10 + 1, name: awayCode + ' Team', shortCode: awayCode },
    homeScore,
    awayScore,
    status,
    utcDate: '2026-06-15T12:00:00Z',
    stage: 'GROUP_STAGE',
    group: 'Group A',
    goals,
    minute: null,
  }
}

function makeDbRow(id: number) {
  return {
    id,
    home_team:   'Argentina',
    away_team:   'Netherlands',
    home_score:  2,
    away_score:  1,
    status:      'FINISHED',
    stage:       'GROUP_STAGE',
    match_group: 'Group A',
    utc_date:    '2026-06-15T12:00:00Z',
    goals:       [{ scorer: 'L. Messi', minute: 10, team: 'home' }] as Goal[],
    live_minute: null,
    updated_at:  '2026-06-15T14:00:00Z',
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PoolService', () => {
  let service: PoolService
  let orderFn: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    service = new PoolService()

    // Grab exposed internals from the mock module
    const supabaseMod = await import('@/lib/supabase') as {
      supabase: unknown
      __orderFn: ReturnType<typeof vi.fn>
    }
    orderFn = supabaseMod.__orderFn
    // Default: empty result set
    orderFn.mockReturnValue({ data: [], error: null })
  })

  // ─── getAllMatches() ───────────────────────────────────────────────────────

  describe('getAllMatches()', () => {
    it('maps DB snake_case rows to camelCase Match[] correctly', async () => {
      const row = makeDbRow(99)
      orderFn.mockReturnValue({ data: [row], error: null })

      const matches = await service.getAllMatches()

      expect(matches).toHaveLength(1)
      const m = matches[0]
      expect(m.id).toBe(99)
      expect(m.homeTeam.name).toBe('Argentina')
      expect(m.awayTeam.name).toBe('Netherlands')
      expect(m.homeScore).toBe(2)
      expect(m.awayScore).toBe(1)
      expect(m.status).toBe('FINISHED')
      expect(m.stage).toBe('GROUP_STAGE')
      expect(m.group).toBe('Group A')
      expect(m.utcDate).toBe('2026-06-15T12:00:00Z')
      expect(m.goals).toHaveLength(1)
      expect(m.goals[0]).toMatchObject({ scorer: 'L. Messi', minute: 10, team: 'home' })
      expect(m.minute).toBeNull()
    })

    it('maps null match_group to undefined group', async () => {
      const row = { ...makeDbRow(100), match_group: null }
      orderFn.mockReturnValue({ data: [row], error: null })

      const matches = await service.getAllMatches()
      expect(matches[0].group).toBeUndefined()
    })

    it('throws on Supabase read error', async () => {
      orderFn.mockReturnValue({ data: null, error: { message: 'connection refused' } })

      await expect(service.getAllMatches()).rejects.toThrow('SUPABASE_READ_ERROR')
    })
  })

  // ─── computeLeaderboard() ─────────────────────────────────────────────────

  describe('computeLeaderboard()', () => {

    // Test 1: win awards 3 points
    it('correctly awards 3 points to the member whose team won', () => {
      // ARG (Alice) beats KSA 2-0. NED (Alice) draws KSA 1-1.
      // Alice: 3+1 = 4 pts, 1W 1D
      const matches: Match[] = [
        makeMatch(1, 'ARG', 'KSA', 2, 0, 'FINISHED'),
        makeMatch(2, 'NED', 'KSA', 1, 1, 'FINISHED'),
      ]

      const board = service.computeLeaderboard(matches)
      const alice = board.find((r) => r.member.id === 'alice')!

      expect(alice.won).toBe(1)
      expect(alice.drawn).toBe(1)
      expect(alice.lost).toBe(0)
      expect(alice.points).toBe(4)
      expect(alice.played).toBe(2)
      expect(alice.goalsFor).toBe(3)      // 2 (ARG) + 1 (NED)
      expect(alice.goalsAgainst).toBe(1)  // 0 (ARG) + 1 (NED)
      expect(alice.goalDifference).toBe(2)
    })

    // Test 2: draw awards 1 point to each member whose team drew
    it('awards 1 point to each member whose team draws', () => {
      // FRA (Bob) vs ARG (Alice) 1-1
      const matches: Match[] = [
        makeMatch(1, 'FRA', 'ARG', 1, 1, 'FINISHED'),
      ]

      const board = service.computeLeaderboard(matches)
      const alice = board.find((r) => r.member.id === 'alice')!
      const bob   = board.find((r) => r.member.id === 'bob')!

      expect(alice.points).toBe(1)
      expect(alice.drawn).toBe(1)
      expect(alice.played).toBe(1)
      expect(alice.goalsFor).toBe(1)
      expect(alice.goalsAgainst).toBe(1)

      expect(bob.points).toBe(1)
      expect(bob.drawn).toBe(1)
      expect(bob.played).toBe(1)
      expect(bob.goalsFor).toBe(1)
      expect(bob.goalsAgainst).toBe(1)
    })

    // Test 3: tiebreaker by wins
    it('ranks a member with more wins higher when points are equal', () => {
      // Alice: ARG wins 1-0 (+3pts, GD+1) AND NED draws 0-0 (+1pt) → 4pts, 1W 1D
      // Bob:   FRA wins 1-0 (+3pts, GD+1) AND CRO draws 0-0 (+1pt) → 4pts, 1W 1D
      // Equal — so put Alice at 2W and Bob at 0W:
      // Alice: ARG wins 1-0 (+3) AND NED wins 1-0 (+3) → 6pts, 2W
      // Bob:   FRA draws 1-1 (+1) AND CRO draws 1-1 (+1) AND
      //        FRA draws 0-0 (+1) AND CRO draws 0-0 (+1) → 4pts — not equal
      //
      // Simple equal-points scenario with different wins:
      // Alice: ARG wins 2-1 (+3pts, 1W, GD+1), NED loses 0-2 (+0pts, 1L, GD-2)
      //        → 3pts, 1W 0D 1L, GD=-1
      // Bob:   FRA draws 1-1 (+1pt), CRO draws 1-1 (+1pt), FRA draws 0-0 (+1pt)
      //        → 3pts, 0W 3D 0L, GD=0
      // Equal points (3), different wins (Alice=1, Bob=0), Alice ranks higher
      const matches: Match[] = [
        makeMatch(1, 'ARG', 'KSA', 2, 1, 'FINISHED'), // Alice ARG wins
        makeMatch(2, 'KSA', 'NED', 2, 0, 'FINISHED'), // Alice NED loses (as away)
        makeMatch(3, 'FRA', 'KSA', 1, 1, 'FINISHED'), // Bob FRA draws
        makeMatch(4, 'CRO', 'KSA', 1, 1, 'FINISHED'), // Bob CRO draws
        makeMatch(5, 'FRA', 'TMP', 0, 0, 'FINISHED'), // Bob FRA draws (3rd point)
      ]

      const board = service.computeLeaderboard(matches)
      const aliceRow = board.find((r) => r.member.id === 'alice')!
      const bobRow   = board.find((r) => r.member.id === 'bob')!

      expect(aliceRow.points).toBe(3)
      expect(bobRow.points).toBe(3)
      expect(aliceRow.won).toBe(1)
      expect(bobRow.won).toBe(0)
      expect(aliceRow.rank).toBeLessThan(bobRow.rank)
    })

    // Test 4: tiebreaker by goal difference
    it('ranks a member with better goal difference higher when points and wins are equal', () => {
      // Alice: ARG wins 3-0 (+3pts, GD=+3)
      // Bob:   FRA wins 1-0 (+3pts, GD=+1)
      // Equal points AND wins; Alice has better GD → ranks first
      const matches: Match[] = [
        makeMatch(1, 'ARG', 'KSA', 3, 0, 'FINISHED'),
        makeMatch(2, 'FRA', 'KSA', 1, 0, 'FINISHED'),
      ]

      const board = service.computeLeaderboard(matches)
      const aliceRank = board.find((r) => r.member.id === 'alice')!.rank
      const bobRank   = board.find((r) => r.member.id === 'bob')!.rank

      expect(aliceRank).toBeLessThan(bobRank)
    })

    // Test 5: member with no finished matches has zeroed stats
    it('returns zeroed stats for a member whose teams have no finished matches', () => {
      const matches: Match[] = [
        makeMatch(1, 'ARG', 'KSA', 2, 0, 'FINISHED'), // Alice only
        makeMatch(2, 'ENG', 'URU', null, null, 'SCHEDULED'), // Dave's teams, not finished
      ]

      const board = service.computeLeaderboard(matches)
      const dave = board.find((r) => r.member.id === 'dave')!

      expect(dave.played).toBe(0)
      expect(dave.won).toBe(0)
      expect(dave.drawn).toBe(0)
      expect(dave.lost).toBe(0)
      expect(dave.points).toBe(0)
      expect(dave.goalsFor).toBe(0)
      expect(dave.goalsAgainst).toBe(0)
      expect(dave.goalDifference).toBe(0)
    })

    // Test 6: FINISHED results for an eliminated team are included
    it('includes historical FINISHED results for an eliminated (knocked-out) team', () => {
      // CRO (Bob) lost their group stage and is eliminated, but the match is FINISHED.
      // FRA (Bob) won their match.
      const matches: Match[] = [
        makeMatch(1, 'ARG', 'CRO', 2, 0, 'FINISHED'), // Bob's CRO loses
        makeMatch(2, 'FRA', 'KSA', 1, 0, 'FINISHED'), // Bob's FRA wins
      ]

      const board = service.computeLeaderboard(matches)
      const bob = board.find((r) => r.member.id === 'bob')!

      expect(bob.played).toBe(2)
      expect(bob.won).toBe(1)
      expect(bob.lost).toBe(1)
      expect(bob.points).toBe(3)
      expect(bob.goalsFor).toBe(1)      // 0 (CRO as away) + 1 (FRA)
      expect(bob.goalsAgainst).toBe(2)  // 2 (CRO as away) + 0 (FRA)
      expect(bob.goalDifference).toBe(-1)
    })
  })
})
