import { FastifyReply, FastifyRequest } from 'fastify'
import { db } from '@ponti/utils/db'
import { users } from '@ponti/utils/schema'
import { eq } from 'drizzle-orm'

export interface AuthUser {
  id: string
  email: string
  clerkId: string
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
    userId?: string
  }
}

export async function getHominemUser(clerkId: string): Promise<AuthUser | null> {
  if (!clerkId) return null

  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId))
  return user || null
}

export async function verifyAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get the auth token from the header
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    
    // This is a placeholder for Clerk authentication
    // In a real implementation, you would validate the token with Clerk
    // For now, we'll assume the token is the clerkId and look up the user
    const user = await getHominemUser(token)

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    // Add the user to the request
    request.user = user
    request.userId = user.id
  } catch (error) {
    request.log.error(error)
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}