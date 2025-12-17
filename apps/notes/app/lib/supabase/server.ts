// Re-export from @hominem/auth to maintain backward compatibility
// This ensures all apps use the same Supabase server client implementation
export {
  createSupabaseClient as createSupabaseServerClient,
  getServerSession,
} from '@hominem/auth/server'

/**
 * Require authentication - throws 401 if not authenticated
 * Returns headers that MUST be included in the response
 */
export async function requireAuth(request: Request) {
  const { user, session, headers } = await getServerSession(request)

  if (!user || !session) {
    throw new Response('Unauthorized', { status: 401 })
  }

  return { user, session, headers }
}
