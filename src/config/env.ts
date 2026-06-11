/**
 * Typed wrapper for all VITE_* environment variables.
 * This is the single source of truth — never use import.meta.env directly in application code.
 *
 * SERVER-SIDE ONLY variables (ONESIGNAL_REST_API_KEY, SUPABASE_SERVICE_ROLE_KEY) are NOT
 * exported here. They are accessed only in Netlify Functions via process.env.
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key]
  if (!value) {
    throw new Error(
      `[env] Required environment variable "${key}" is missing. ` +
      `Ensure it is set in your .env file or deployment environment. ` +
      `See .env.example for all required variables.`
    )
  }
  return value as string
}

function optionalEnv(key: string, warnIfMissing = false): string {
  const value = import.meta.env[key]
  if (!value && warnIfMissing) {
    console.warn(
      `[env] Optional environment variable "${key}" is not set. ` +
      `Some features may be unavailable.`
    )
  }
  return (value as string) ?? ''
}

// Required — throws on startup if missing
export const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL')
export const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY')

// Optional for early development — warns if missing
export const FOOTBALL_API_KEY = optionalEnv('VITE_FOOTBALL_API_KEY')
export const ONESIGNAL_APP_ID = optionalEnv('VITE_ONESIGNAL_APP_ID', true)

// Non-secret constant — public URL, but must not be hardcoded in service code
export const FOOTBALL_API_BASE_URL =
  import.meta.env['VITE_FOOTBALL_API_BASE_URL'] ?? 'https://api.football-data.org/v4'

/**
 * Returns all client-safe config values as a typed object.
 * Prefer named exports above; use this for cases that need the full config object.
 */
export function getConfig() {
  return {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    FOOTBALL_API_KEY,
    FOOTBALL_API_BASE_URL,
    ONESIGNAL_APP_ID,
  } as const
}
