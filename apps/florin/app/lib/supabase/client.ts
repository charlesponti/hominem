import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
