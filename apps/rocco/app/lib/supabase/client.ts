import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '../env'

let browserSupabase: SupabaseClient | null = null

export function createClient() {
  if (browserSupabase) return browserSupabase
  browserSupabase = createBrowserClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
  return browserSupabase
}
