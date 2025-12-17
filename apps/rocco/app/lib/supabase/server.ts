// Re-export from @hominem/auth to maintain backward compatibility
// This ensures all apps use the same Supabase server client implementation
export { createSupabaseClient as createClient } from '@hominem/auth/server'
