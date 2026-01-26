import { getInvitesForUser } from '@hominem/lists-services';
import { success, error } from '@hominem/services';
import { Hono } from 'hono';

import type { AppEnv } from '../server';

export const invitesIncomingRoutes = new Hono<AppEnv>();

// Get incoming invites for the authenticated user
invitesIncomingRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(error('UNAUTHORIZED', 'Unauthorized'), 401);
  }

  try {
    const invites = await getInvitesForUser(userId);
    const pendingInvites = invites.filter((invite) => invite.accepted === false);

    // Note: listInvite has timestamps with mode: 'string', so they're already serialized
    return c.json(success(pendingInvites), 200);
  } catch (err) {
    console.error('Error fetching incoming invites:', err);
    return c.json(
      error('INTERNAL_ERROR', 'Failed to fetch invites', {
        details: err instanceof Error ? err.message : String(err),
      }),
      500,
    );
  }
});
