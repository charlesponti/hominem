import { Hono } from 'hono';

import { createPlaidLinkToken, requirePlaidUserId } from '../../../lib/plaid-actions';
import type { AppEnv } from '../../../server';

export const financePlaidCreateLinkTokenRoutes = new Hono<AppEnv>();

// Create a new Plaid link token
financePlaidCreateLinkTokenRoutes.post('/', async (c) => {
  const userId = requirePlaidUserId(c.get('userId'));
  return c.json(await createPlaidLinkToken(userId));
});
