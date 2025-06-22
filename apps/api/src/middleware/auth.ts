import { db } from '@hominem/utils/db'
import { users } from '@hominem/utils/schema'
import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import type { Context, Next } from 'hono'
import { randomUUID } from 'node:crypto'
import { env } from '../lib/env'

export const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

export async function getHominemUser(
  supabaseId: string
): Promise<typeof users.$inferSelect | null> {
  if (!supabaseId) return null

  const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId))

  // Create a user for this supabase user if one does not exist
  if (!user) {
    const { data: supabaseUser, error } = await supabaseClient.auth.admin.getUserById(supabaseId)
    if (supabaseUser?.user && !error) {
      const [newUser] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          email: supabaseUser.user.email || '',
          supabaseId,
        })
        .returning()
      return newUser
    }
  }

  return user
}

export const authenticateUser = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401)
    }

    const token = authHeader.substring(7)
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(token)

    if (error || !user) {
      return c.json({ error: 'Invalid token' }, 401)
    }

    const hominemUser = await getHominemUser(user.id)
    if (!hominemUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    // Set user data in context
    c.set('user', hominemUser)
    c.set('userId', hominemUser.id)
    c.set('supabaseId', user.id)

    await next()
  } catch (error) {
    return c.json({ error: 'Authentication failed' }, 500)
  }
}

// Middleware for routes that require authentication
export const requireAuth = authenticateUser
