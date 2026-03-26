import { Hono } from 'hono';

import { disconnectPlaidConnection, requirePlaidUserId } from '../../../lib/plaid-actions';
import type { AppEnv } from '../../../server';

export const financePlaidDisconnectRoutes = new Hono<AppEnv>();

// Disconnect a Plaid connection
financePlaidDisconnectRoutes.delete('/:itemId', async (c) => {
  const userId = requirePlaidUserId(c.get('userId'));
  return c.json(await disconnectPlaidConnection({ userId, itemId: c.req.param('itemId') }));
});
