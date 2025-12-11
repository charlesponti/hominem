import { createClient } from '~/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export type AuthState = {
  user: User | null
  isAuthenticated: boolean
}

/**
 * Checks authentication state for a request.
 * Used in loaders to determine if a user is authenticated.
 *
 * @param request - The incoming request object
 * @returns Authentication state with user and isAuthenticated flag
 */
export async function getAuthState(request: Request): Promise<AuthState> {
  const { supabase } = createClient(request)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('Error fetching user in auth loader:', userError)
  }

  return {
    user: user ?? null,
    isAuthenticated: Boolean(user),
  }
}
