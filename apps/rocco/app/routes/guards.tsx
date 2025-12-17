import { createSupabaseClient } from '@hominem/auth/server'
import { data, type LoaderFunctionArgs, redirect } from 'react-router'

/**
 * Auth guard for loaders - redirects to login if user is not authenticated
 * @param request The request object
 * @returns An object with authenticated user information
 */
export async function requireAuth(loaderArgs: LoaderFunctionArgs) {
  const { supabase } = createSupabaseClient(loaderArgs.request)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw data('Unauthenticated', { status: 401 })
  }

  // Get session for access token
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return {
    userId: user.id,
    user,
    session,
    getToken: async () => session?.access_token,
  }
}

/**
 * Guard to restrict access to guests only (not authenticated users)
 * @param request The request object
 * @returns Redirects to home if user is already authenticated
 */
export async function requireGuest(loaderArgs: LoaderFunctionArgs) {
  const { supabase } = createSupabaseClient(loaderArgs.request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return redirect('/')
  }

  return { isGuest: true }
}
