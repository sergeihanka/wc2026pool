import type { Match } from '@/types'

export interface IScoreService {
  getMatches(): Promise<Match[]>
  getMatch(id: number): Promise<Match>
}
