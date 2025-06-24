import { db } from '@hominem/utils/db'
import { listInvite } from '@hominem/utils/schema'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
export const invitesOutgoingRoutes = new Hono()

// Get outgoing invites created by the authenticated user
invitesOutgoingRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const invites = await db.select().from(listInvite).where(eq(listInvite.userId, userId))

    return c.json(invites)
  } catch (error) {
    console.error('Error fetching outgoing invites:', error)
    return c.json(
      {
        error: 'Failed to fetch outgoing invites',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
