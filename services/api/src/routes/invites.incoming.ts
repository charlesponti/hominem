import { getInvitesForUser } from '@hominem/lists-services';
import { UnauthorizedError, InternalError } from '@hominem/services';
import { Hono } from 'hono';

import type { AppEnv } from '../server';

export const invitesIncomingRoutes = new Hono<AppEnv>();

// Get incoming invites for the authenticated user
invitesIncomingRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    throw new UnauthorizedError('Unauthorized');
  }

   try {
     const invites = await getInvitesForUser(userId);
     const pendingInvites = invites.filter((invite) => invite.isAccepted === false);

    // Note: listInvite has timestamps with mode: 'string', so they're already serialized
    return c.json(pendingInvites);
  } catch (err) {
    console.error('Error fetching incoming invites:', err);
    throw new InternalError('Failed to fetch invites', {
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
