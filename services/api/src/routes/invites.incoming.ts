import { getInvitesForUser } from '@hominem/lists-services';
import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import { internal, unauthorized } from '../errors';
import type { AppEnv } from '../server';

export const invitesIncomingRoutes = new Hono<AppEnv>();

// Get incoming invites for the authenticated user
invitesIncomingRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    throw unauthorized('Unauthorized');
  }

  try {
    const invites = await getInvitesForUser(userId);
    const pendingInvites = invites.filter((invite) => invite.accepted === false);

    // Note: listInvite has timestamps with mode: 'string', so they're already serialized
    return c.json(pendingInvites);
  } catch (err) {
    logger.error('Error fetching incoming invites', { error: err });
    throw internal('Failed to fetch invites', undefined, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
