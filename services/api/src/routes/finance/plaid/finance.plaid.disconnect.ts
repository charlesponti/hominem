import { getPlaidItemByUserAndItemId, updatePlaidItemStatusById } from '@hominem/finance-services';
import { UnauthorizedError, NotFoundError, InternalError } from '@hominem/services';
import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import type { AppEnv } from '../../../server';

import { plaidClient } from '../../../lib/plaid';

export const financePlaidDisconnectRoutes = new Hono<AppEnv>();

// Disconnect a Plaid connection
financePlaidDisconnectRoutes.delete('/:itemId', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    throw new UnauthorizedError('Not authorized');
  }

  const itemId = c.req.param('itemId');

  try {
    // Find the plaid item for this user
    const plaidItem = await getPlaidItemByUserAndItemId(userId, itemId);

    if (!plaidItem) {
      throw new NotFoundError('Plaid item not found');
    }

    // Remove the item from Plaid
    try {
      await plaidClient.itemRemove({
        access_token: plaidItem.accessToken,
      });
    } catch (plaidError) {
      logger.warn(`Failed to remove item from Plaid (continuing anyway)`, { error: plaidError });
    }

    // Mark as disconnected in our database
    await updatePlaidItemStatusById(plaidItem.id, {
      status: 'error', // Using 'error' status to indicate disconnected
      error: 'Disconnected by user',
      updatedAt: new Date().toISOString(),
    });

    return c.json({
      message: 'Successfully disconnected account',
    });
  } catch (err) {
    logger.error(`Disconnect error`, { error: err });
    throw new InternalError('Failed to disconnect account');
  }
});
