import type { Match } from '@/types'
import type { IScoreService } from './IScoreService'
import matchesFixture from '@/mock/fixtures/matches.json'
import { MOCK_DELAY, MOCK_DELAY_MS } from './localConfig'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class MockScoreService implements IScoreService {
  async getMatches(): Promise<Match[]> {
    if (MOCK_DELAY) await delay(MOCK_DELAY_MS)
    return matchesFixture as Match[]
  }

  async getMatch(id: number): Promise<Match> {
    if (MOCK_DELAY) await delay(MOCK_DELAY_MS)
    const match = (matchesFixture as Match[]).find((m) => m.id === id)
    if (!match) {
      throw new Error(`MATCH_NOT_FOUND: No match with id ${id}`)
    }
    return match
  }
}
