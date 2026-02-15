import { getSpendingCategories } from '@hominem/finance-services';
import { UnauthorizedError, InternalError } from '@hominem/services';
import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import type { AppEnv } from '../../server';

// Keep existing Hono route for backward compatibility
export const financeCategoriesRoutes = new Hono<AppEnv>();

// Get spending categories
financeCategoriesRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    throw new UnauthorizedError('Not authorized');
  }

  try {
    const categories = await getSpendingCategories(userId);
    return c.json(categories);
  } catch (err) {
    logger.error('Error fetching spending categories', { error: err });
    throw new InternalError('Failed to fetch spending categories', {
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
