import { getPlaidItemByUserAndItemId, updatePlaidItemStatusById } from '@hominem/finance-services';
import { success, error } from '@hominem/services';
import { Hono } from 'hono';

import { plaidClient } from '../../../lib/plaid';
import type { AppEnv } from '../../../server';

export const financePlaidDisconnectRoutes = new Hono<AppEnv>();

// Disconnect a Plaid connection
financePlaidDisconnectRoutes.delete('/:itemId', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(error('UNAUTHORIZED', 'Not authorized'), 401);
  }

  const itemId = c.req.param('itemId');

  try {
    // Find the plaid item for this user
    const plaidItem = await getPlaidItemByUserAndItemId(userId, itemId);

    if (!plaidItem) {
      return c.json(error('NOT_FOUND', 'Plaid item not found'), 404);
    }

    // Remove the item from Plaid
    try {
      await plaidClient.itemRemove({
        access_token: plaidItem.accessToken,
      });
    } catch (plaidError) {
      console.warn(`Failed to remove item from Plaid (continuing anyway): ${plaidError}`);
    }

    // Mark as disconnected in our database
    await updatePlaidItemStatusById(plaidItem.id, {
      status: 'error', // Using 'error' status to indicate disconnected
      error: 'Disconnected by user',
      updatedAt: new Date(),
    });

    return c.json(
      success({
        message: 'Successfully disconnected account',
      }),
      200,
    );
  } catch (err) {
    console.error(`Disconnect error: ${err}`);
    return c.json(error('INTERNAL_ERROR', 'Failed to disconnect account'), 500);
  }
});
