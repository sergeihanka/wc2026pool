import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env'

/**
 * Singleton Supabase client.
 * This is the only location that calls createClient.
 * All other files import `supabase` from here.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
