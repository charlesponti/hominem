import { getSpendingCategories } from '@hominem/finance-services';
import { NotFoundError, ValidationError, InternalError, isServiceError } from '@hominem/services';
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

    const result = await getSpendingCategories(userId);
    const categories = result.map((r) => r.category).filter((cat): cat is string => cat !== null);

    return c.json<CategoriesListOutput>(categories, 200);
  });
