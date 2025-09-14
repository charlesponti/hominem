import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify'
import { supabaseAdmin } from '../../../middleware/auth'

export const verifyIsAdmin: preHandlerAsyncHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Get the Authorization header
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send()
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  try {
    // Verify the JWT token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return reply.code(401).send()
    }

    // Check if user is admin (you'll need to implement this based on your user schema)
    // For now, we'll check the user metadata or a custom claim
    const isAdmin = user.user_metadata?.isAdmin || user.app_metadata?.isAdmin

    if (!isAdmin) {
      return reply.code(403).send()
    }
  } catch (error) {
    request.log.error(error)
    return reply.code(401).send()
  }
}
