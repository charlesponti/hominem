import { Hono } from 'hono';

import { logger } from '@hominem/utils/logger';

import { authMiddleware, type AppContext } from '../middleware/auth';
import type { UserDeleteAccountOutput } from '../types/user.types';

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
    // const userId = c.get('userId')!;

    try {
      // TODO: Implement account deletion logic
      logger.warn('[user.delete-account] Not yet implemented');

      return c.json<UserDeleteAccountOutput>(
        {
          success: false,
          error: 'Account deletion is not yet available.',
        },
        501,
      );
    } catch (err) {
      logger.error('[user.delete-account] unexpected error', { error: err });
      return c.json<UserDeleteAccountOutput>(
        {
          success: false,
          error: 'Failed to delete account.',
        },
        500,
      );
    }
  });
