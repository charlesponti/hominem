import { getOutboundInvites } from '@hominem/lists-services';
import { UnauthorizedError, InternalError } from '@hominem/services';
import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import type { AppEnv } from '../server';

export const invitesOutgoingRoutes = new Hono<AppEnv>();

// Get outgoing invites created by the authenticated user
invitesOutgoingRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    throw new UnauthorizedError('Unauthorized');
  }

  try {
    const invites = await getOutboundInvites(userId);

    // Note: listInvite has timestamps with mode: 'string', so they're already serialized
    return c.json(invites);
  } catch (err) {
    logger.error('Error fetching outgoing invites', { error: err });
    throw new InternalError('Failed to fetch outgoing invites', {
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
