import { db } from '@hominem/utils/db'
import { users } from '@hominem/utils/schema'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'

export const userRoutes = new Hono()

userRoutes.get('/', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    return c.json(user)
  } catch (error) {
    console.error('Could not fetch user:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

userRoutes.delete('/', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

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
