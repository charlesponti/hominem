import { Hono } from 'hono';

import { isServiceError } from '../../../errors';
import { createPlaidLinkToken, requirePlaidUserId } from '../../../lib/plaid-actions';
import type { AppEnv } from '../../../server';

export const financePlaidCreateLinkTokenRoutes = new Hono<AppEnv>();

// Create a new Plaid link token
financePlaidCreateLinkTokenRoutes.post('/', async (c) => {
  try {
    const userId = requirePlaidUserId(c.get('userId'));
    return c.json(await createPlaidLinkToken(userId));
  } catch (error) {
    if (isServiceError(error)) {
      return c.json({ error: error.message }, error.statusCode);
    }

    return c.json({ error: 'Failed to create link token' }, 500);
  }
});
