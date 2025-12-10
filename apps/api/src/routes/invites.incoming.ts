import { getInvitesForUser } from '@hominem/data'
import { Hono } from 'hono'
export const invitesIncomingRoutes = new Hono()

// Get incoming invites for the authenticated user
invitesIncomingRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const invites = await getInvitesForUser(userId)
    const pendingInvites = invites.filter((invite) => invite.accepted === false)

    return c.json(pendingInvites)
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
