import { getTransactionTags } from '@hominem/finance-services';
import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import { InternalError, UnauthorizedError } from '../../errors';
import type { AppEnv } from '../../server';

export const financeTagsRoutes = new Hono<AppEnv>();

financeTagsRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    throw new UnauthorizedError('Not authorized');
  }

  try {
    const tags = await getTransactionTags(userId);
    return c.json(tags);
  } catch (err) {
    logger.error('Error fetching finance tags', { error: err });
    throw new InternalError('Failed to fetch finance tags', {
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
