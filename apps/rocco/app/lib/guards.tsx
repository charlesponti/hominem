import { getServerSession } from '@hominem/auth/server'

/**
 * Require authentication - throws 401 if not authenticated
 * Returns headers that MUST be included in the response
 *
 * @param request - The incoming request object
 * @returns User, session, and headers if authenticated
 * @throws Response with 401 status if not authenticated
 */
export async function requireAuth(request: Request) {
  const { user, session, headers } = await getServerSession(request)

  if (!user || !session) {
    throw new Response('Unauthorized', { status: 401 })
  }

  return { user, session, headers }
}
