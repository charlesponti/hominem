import { getSpendingCategories } from '@hominem/finance-services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Finance Categories Routes
 *
 * Handles category operations:
 * - POST /list - List spending categories
 */

export const categoriesRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /list - List categories
  .post('/list', async (c) => {
    const userId = c.get('userId')!;

    try {
      const result = await getSpendingCategories(userId);
      return c.json(result);
    } catch (error) {
      console.error('Error listing categories:', error);
      return c.json({ error: 'Failed to list categories' }, 500);
    }
  });
