import { getPlaidItemByUserAndItemId } from '@hominem/finance-services';
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  InternalError,
} from '@hominem/services';
import { QUEUE_NAMES } from '@hominem/utils/consts';
import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import type { AppEnv } from '../../../server';

export const financePlaidSyncRoutes = new Hono<AppEnv>();

// Manually trigger sync for a specific item
financePlaidSyncRoutes.post('/:itemId', async (c) => {
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

    if (plaidItem.status !== 'active') {
      throw new ValidationError('Plaid item is not active');
    }

    // Queue sync job
    const queues = c.get('queues');
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
      },
    );

    return c.json({
      message: 'Sync job queued successfully',
    });
  } catch (err) {
    logger.error(`Manual sync error`, { error: err });
    throw new InternalError('Failed to queue sync job');
  }
});
