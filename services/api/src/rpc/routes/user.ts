import { Hono } from 'hono';

import { UserAuthService } from '@hominem/auth/server';
import { logger } from '@hominem/utils/logger';

import { authMiddleware, type AppContext } from '../middleware/auth';
import type { UserDeleteAccountOutput } from '@hominem/rpc/types/user.types';

/**
 * User Routes
 *
 * Handles user account operations.
 */

// ============================================================================
// Routes
// ============================================================================

export const userRoutes = new Hono<AppContext>()
  // Delete account (stub implementation)
  .post('/delete-account', authMiddleware, async (c) => {
    const userId = c.get('userId')!;

    try {
      const deleted = await UserAuthService.deleteUser(userId);
      logger.info('user_account_deleted', { userId });
      return c.json<UserDeleteAccountOutput>({ success: deleted });
    } catch (err) {
      logger.error('[user.delete-account] unexpected error', { error: err });
      return c.json<UserDeleteAccountOutput>(
        { success: false, error: 'Failed to delete account.' },
        500,
      );
    }
  });
