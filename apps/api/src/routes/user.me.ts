import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'

export const userMeRoutes = new Hono()

// Get current user profile
userMeRoutes.get('/', requireAuth, async (c) => {
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
