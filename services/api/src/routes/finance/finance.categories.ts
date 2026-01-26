import { getSpendingCategories } from '@hominem/finance-services';
import { success, error } from '@hominem/services';
import { Hono } from 'hono';

import type { AppEnv } from '../../server';

// Keep existing Hono route for backward compatibility
export const financeCategoriesRoutes = new Hono<AppEnv>();

// Get spending categories
financeCategoriesRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(error('UNAUTHORIZED', 'Not authorized'), 401);
  }

  try {
    const categories = await getSpendingCategories(userId);
    return c.json(success(categories), 200);
  } catch (err) {
    console.error('Error fetching spending categories:', err);
    return c.json(
      error('INTERNAL_ERROR', 'Failed to fetch spending categories', {
        details: err instanceof Error ? err.message : String(err),
      }),
      500,
    );
  }
});
