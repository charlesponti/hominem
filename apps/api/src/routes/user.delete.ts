import { db } from '@hominem/utils/db'
import { users } from '@hominem/utils/schema'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'

export const userDeleteRoutes = new Hono()

// Delete current user account
userDeleteRoutes.delete('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    await db.delete(users).where(eq(users.id, userId))
    return c.json({ success: true })
  } catch (error) {
    console.error('Could not delete user:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})
