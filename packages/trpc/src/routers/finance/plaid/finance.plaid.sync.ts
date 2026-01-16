import { getPlaidItemByUserAndItemId } from '@hominem/data/finance'
import { QUEUE_NAMES } from '@hominem/utils/consts'
import { Hono } from 'hono'
export const financePlaidSyncRoutes = new Hono()

// Manually trigger sync for a specific item
financePlaidSyncRoutes.post('/:itemId', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  const itemId = c.req.param('itemId')

  try {
    // Find the plaid item for this user
    const plaidItem = await getPlaidItemByUserAndItemId(userId, itemId)

    if (!plaidItem) {
      return c.json({ error: 'Plaid item not found' }, 404)
    }

    if (plaidItem.status !== 'active') {
      return c.json({ error: 'Plaid item is not active' }, 400)
    }

    // Queue sync job
    const queues = c.get('queues')
    await queues.plaidSync.add(
      QUEUE_NAMES.PLAID_SYNC,
      {
        userId,
        accessToken: plaidItem.accessToken,
        itemId,
        initialSync: false,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: 1000,
      }
    )

    return c.json({
      success: true,
      message: 'Sync job queued successfully',
    })
  } catch (error) {
    console.error(`Manual sync error: ${error}`)
    return c.json({ error: 'Failed to queue sync job' }, 500)
  }
})
