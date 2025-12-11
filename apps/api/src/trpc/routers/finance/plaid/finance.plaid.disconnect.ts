import { getPlaidItemByUserAndItemId, updatePlaidItemStatusById } from '@hominem/data/finance'
import { Hono } from 'hono'
import { plaidClient } from '../../../../lib/plaid.js'
export const financePlaidDisconnectRoutes = new Hono()

// Disconnect a Plaid connection
financePlaidDisconnectRoutes.delete('/:itemId', async (c) => {
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

    // Remove the item from Plaid
    try {
      await plaidClient.itemRemove({
        access_token: plaidItem.accessToken,
      })
    } catch (plaidError) {
      console.warn(`Failed to remove item from Plaid (continuing anyway): ${plaidError}`)
    }

    // Mark as disconnected in our database
    await updatePlaidItemStatusById(plaidItem.id, {
      status: 'error', // Using 'error' status to indicate disconnected
      error: 'Disconnected by user',
      updatedAt: new Date(),
    })

    return c.json({
      success: true,
      message: 'Successfully disconnected account',
    })
  } catch (error) {
    console.error(`Disconnect error: ${error}`)
    return c.json({ error: 'Failed to disconnect account' }, 500)
  }
})
