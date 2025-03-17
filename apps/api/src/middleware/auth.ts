import { getAuth } from '@clerk/fastify'
import { db } from '@ponti/utils/db'
import { users } from '@ponti/utils/schema'
import { eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

export async function getHominemUser(clerkId: string): Promise<typeof users.$inferSelect | null> {
  if (!clerkId) return null

  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId))
  return user || null
}

export async function verifyAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = getAuth(request)

    if (!auth.userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const user = await getHominemUser(auth.userId)

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    request.user = user
    request.userId = user.id
  } catch (error) {
    request.log.error(error)
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}
