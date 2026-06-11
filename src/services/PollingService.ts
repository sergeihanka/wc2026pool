/**
 * PollingService — stub retained for backward compatibility with components
 * that call polling.start() / polling.stop().
 *
 * All live data fetching now happens server-side via the Netlify scheduled
 * function `poll-scores`. Browsers receive updates via Supabase Realtime
 * (see useScores.ts). No football-data.org calls are made from the browser.
 */

export class PollingService {
  private static instance: PollingService | null = null

  static getInstance(): PollingService {
    if (!PollingService.instance) {
      PollingService.instance = new PollingService()
    }
    return PollingService.instance
  }

  // No-ops — kept so existing callers in HomePage / ScoresPage compile without changes.
  start(): void {}
  stop(): void {}
  getLastFetchTime(): Date | null { return null }
  getIsPolling(): boolean { return false }
}
