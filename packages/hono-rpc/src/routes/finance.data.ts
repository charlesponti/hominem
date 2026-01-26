import { deleteAllFinanceData } from '@hominem/finance-services';
import { error, success, isServiceError } from '@hominem/services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';
import { type DataDeleteAllOutput } from '../types/finance.types';

/**
 * Finance Data Management Routes
 */
export const dataRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /delete-all - Delete all finance data
  .post('/delete-all', async (c) => {
    const userId = c.get('userId')!;

    try {
      await deleteAllFinanceData(userId);

      return c.json<DataDeleteAllOutput>(
        success({
          success: true,
          message: 'All finance data deleted',
        }),
        200,
      );
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<DataDeleteAllOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error deleting finance data:', err);
      return c.json<DataDeleteAllOutput>(error('INTERNAL_ERROR', 'Failed to delete finance data'), 500);
    }
  });
