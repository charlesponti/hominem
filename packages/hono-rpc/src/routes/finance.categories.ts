import { getSpendingCategories } from '@hominem/finance-services';
import { error, success, isServiceError } from '@hominem/services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';
import { type CategoriesListOutput } from '../types/finance.types';

/**
 * Finance Categories Routes
 */
export const categoriesRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /list - List categories
  .post('/list', async (c) => {
    const userId = c.get('userId')!;

    try {
      const result = await getSpendingCategories(userId);
      return c.json<CategoriesListOutput>(success(result), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<CategoriesListOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error listing categories:', err);
      return c.json<CategoriesListOutput>(error('INTERNAL_ERROR', 'Failed to list categories'), 500);
    }
  });
