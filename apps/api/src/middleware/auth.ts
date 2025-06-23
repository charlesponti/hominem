import { db } from '@hominem/utils/db'
import { users } from '@hominem/utils/schema'
import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import type { Context, Next } from 'hono'
import { randomUUID } from 'node:crypto'
import { env } from '../lib/env'

// Validate environment variables
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  )
}

export const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function getHominemUser(
  supabaseId: string
): Promise<typeof users.$inferSelect | null> {
  if (!supabaseId) {
    return null
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId))

    if (user) {
      return user
    }

    // Create a user for this supabase user if one does not exist
    const { data: supabaseUser, error } = await supabaseClient.auth.admin.getUserById(supabaseId)

    if (error) {
      return null
    }

    if (!supabaseUser?.user) {
      return null
    }

    const [newUser] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: supabaseUser.user.email || '',
        supabaseId,
      })
      .returning()

    console.log('Successfully created new Hominem user:', newUser.id)
    return newUser
  } catch (error) {
    console.error('Error in getHominemUser:', error)
    return null
  }
}

export const authenticateUser = async (c: Context, next: Next) => {
  try {
    // Test database connection
    try {
      await db.select().from(users).limit(1)
    } catch (dbError) {
      return c.json({ error: 'Database connection failed' }, 500)
    }

    const authHeader = c.req.header('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401)
    }

    const token = authHeader.substring(7)

    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(token)

    if (error) {
      return c.json({ error: 'Invalid token', details: error.message }, 401)
    }

    if (!user) {
      return c.json({ error: 'Invalid token - no user found' }, 401)
    }

    const hominemUser = await getHominemUser(user.id)
    if (!hominemUser) {
      console.error('Auth failed: Hominem user not found for Supabase user:', user.id)
      return c.json({ error: 'User not found' }, 401)
    }

    // Set user data in context
    c.set('user', hominemUser)
    c.set('userId', hominemUser.id)
    c.set('supabaseId', user.id)

    await next()
  } catch (error) {
    console.error('Authentication middleware error:', error)
    return c.json(
      {
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
}

// Middleware for routes that require authentication
export const requireAuth = authenticateUser
