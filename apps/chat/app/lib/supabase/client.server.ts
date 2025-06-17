import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  )
}

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Regular client for user operations
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
