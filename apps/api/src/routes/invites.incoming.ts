import { db } from '@hominem/utils/db'
import { list, listInvite, users } from '@hominem/utils/schema'
import { and, asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
export const invitesIncomingRoutes = new Hono()

// Get incoming invites for the authenticated user
invitesIncomingRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const invites = await db
      .select()
      .from(listInvite)
      .where(and(eq(listInvite.invitedUserId, userId), eq(listInvite.accepted, false)))
      .leftJoin(list, eq(list.id, listInvite.listId))
      .leftJoin(users, eq(users.id, listInvite.userId))
      .orderBy(asc(listInvite.listId))

    return c.json(invites)
  } catch (error) {
    console.error('Error fetching incoming invites:', error)
    return c.json(
      {
        error: 'Failed to fetch invites',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
