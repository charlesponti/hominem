import { deleteAllFinanceData } from '@hominem/finance-services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Finance Data Management Routes
 *
 * Handles data management operations:
 * - POST /delete-all - Delete all finance data for user
 */

export const dataRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /delete-all - Delete all finance data
  .post('/delete-all', async (c) => {
    const userId = c.get('userId')!;

    try {
      await deleteAllFinanceData(userId);

      return c.json({
        success: true,
        message: 'All finance data deleted',
      });
    } catch (error) {
      console.error('Error deleting finance data:', error);
      return c.json({ error: 'Failed to delete finance data' }, 500);
    }
  });
