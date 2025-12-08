import { db } from '@hominem/data'
import { users } from '@hominem/data/schema'
import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { createHominemUserFromDb } from '@hominem/auth'
import type { HominemUser } from '@hominem/auth'
import { env } from '../lib/env.js'

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function getHominemUser(supabaseId: string): Promise<HominemUser | null> {
  if (!supabaseId) return null

  const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId))

  // Create a user for this Supabase user if one does not exist
  if (!user) {
    const { data: supabaseUser, error } = await supabaseAdmin.auth.admin.getUserById(supabaseId)
    if (!error && supabaseUser?.user) {
      const [newUser] = await db.insert(users).values({
        id: supabaseId,
        email: supabaseUser.user.email || '',
        supabaseId,
      })

      return createHominemUserFromDb(newUser)
    }
  }

  return user ? createHominemUserFromDb(user) : null
}

export async function verifyAuth(request: FastifyRequest, reply: FastifyReply) {
  // Skip authentication for specific public routes
  const publicRoutes = ['/health', '/api/health', '/status', '/api/status']
  if (publicRoutes.includes(request.url)) {
    return
  }

  try {
    // Get the Authorization header
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const hominemUser = await getHominemUser(user.id)
    if (!hominemUser) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    request.user = hominemUser
    request.userId = hominemUser.id
  } catch (error) {
    request.log.error(error)
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}
