import { deleteAllFinanceData } from '@hominem/finance-services';
import { isServiceError, InternalError } from '@hominem/services';
import { logger } from '@hominem/utils/logger';
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
        {
          success: true,
          message: 'All finance data deleted',
        },
        200,
      );
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }
      logger.error('Error deleting finance data', { error: err });
      throw new InternalError('Failed to delete finance data');
    }
  });
