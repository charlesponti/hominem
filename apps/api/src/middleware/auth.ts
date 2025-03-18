import { createClerkClient, getAuth } from '@clerk/fastify'
import { db } from '@ponti/utils/db'
import { users } from '@ponti/utils/schema'
import { eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { getEnv } from 'src/lib/env'

const client = createClerkClient({
  publishableKey: getEnv('CLERK_PUBLISHABLE_KEY'),
  secretKey: getEnv('CLERK_SECRET_KEY'),
})
export async function getHominemUser(clerkId: string): Promise<typeof users.$inferSelect | null> {
  if (!clerkId) return null

  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId))

  // Create a user for this clerk user if one does not exist
  if (!user) {
    const clerkUser = await client.users.getUser(clerkId)
    if (clerkUser) {
      const [newUser] = await db.insert(users).values({
        id: crypto.randomUUID(),
        email: clerkUser.emailAddresses[0].emailAddress,
        clerkId,
      })

      return newUser
    }
  }

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
