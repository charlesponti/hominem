import { getOutboundInvites } from '@hominem/lists-services';
import { success, error } from '@hominem/services';
import { Hono } from 'hono';

import type { AppEnv } from '../server';

export const invitesOutgoingRoutes = new Hono<AppEnv>();

// Get outgoing invites created by the authenticated user
invitesOutgoingRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(error('UNAUTHORIZED', 'Unauthorized'), 401);
  }

  try {
    const invites = await getOutboundInvites(userId);

    // Note: listInvite has timestamps with mode: 'string', so they're already serialized
    return c.json(success(invites), 200);
  } catch (err) {
    console.error('Error fetching outgoing invites:', err);
    return c.json(
      error('INTERNAL_ERROR', 'Failed to fetch outgoing invites', {
        details: err instanceof Error ? err.message : String(err),
      }),
      500,
    );
  }
});
