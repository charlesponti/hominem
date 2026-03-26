import { Hono } from 'hono';

import { requirePlaidUserId, syncPlaidItem } from '../../../lib/plaid-actions';
import type { AppEnv } from '../../../server';

export const financePlaidSyncRoutes = new Hono<AppEnv>();

// Manually trigger sync for a specific item
financePlaidSyncRoutes.post('/:itemId', async (c) => {
  const userId = requirePlaidUserId(c.get('userId'));
  return c.json(await syncPlaidItem({ userId, itemId: c.req.param('itemId') }));
});
