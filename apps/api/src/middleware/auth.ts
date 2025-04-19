import { createClerkClient, getAuth } from '@clerk/fastify'
import { db } from '@hominem/utils/db'
import { users } from '@hominem/utils/schema'
import { eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from 'src/lib/env'

// Create a mock client for development
const mockClient = {
  users: {
    getUser: async () => ({
      id: 'dev-user',
      emailAddresses: [{ emailAddress: 'dev@example.com' }]
    })
  }
}

// Only create Clerk client if keys are provided and not empty
export const client = env.CLERK_SECRET_KEY && env.CLERK_PUBLISHABLE_KEY && 
                   env.CLERK_SECRET_KEY !== '' && env.CLERK_PUBLISHABLE_KEY !== ''
  ? createClerkClient({
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
      secretKey: env.CLERK_SECRET_KEY,
    })
  : mockClient as unknown as ReturnType<typeof createClerkClient>

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
  // Skip authentication for specific public routes
  const publicRoutes = ['/health', '/api/health', '/status', '/api/status']
  if (publicRoutes.includes(request.url)) {
    return
  }

  try {
    // Check if Clerk keys are provided, otherwise skip auth for development
    if (!env.CLERK_SECRET_KEY || !env.CLERK_PUBLISHABLE_KEY || 
        env.CLERK_SECRET_KEY === '' || env.CLERK_PUBLISHABLE_KEY === '') {
      request.log.warn('Clerk keys are not provided. Authentication is disabled.')
      request.userId = 'dev-user'
      request.user = { id: 'dev-user', email: 'dev@example.com', clerkId: 'dev' }
      return
    }

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
