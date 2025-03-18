import { clerkClient, getAuth } from '@clerk/fastify'
import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify'

export const verifyIsAdmin: preHandlerAsyncHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const auth = getAuth(request)
  if (!auth.userId) {
    return reply.code(401).send()
  }
  const user = await clerkClient.users.getUser(auth.userId)
  if (!user) {
    return reply.code(401).send()
  }

  const isAdmin = user.publicMetadata.isAdmin

  if (!isAdmin) {
    return reply.code(403).send()
  }
}
