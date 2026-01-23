import { error, success } from '@hominem/services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * User Routes
 *
 * Handles user account operations using the ApiResult pattern:
 * - Services throw typed errors
 * - HTTP endpoints catch errors and return ApiResult
 * - Clients receive discriminated union with `success` field
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
      console.warn('[user.delete-account] Not yet implemented');

      const result: {
        success: boolean;
        message: string;
      } = {
        success: false,
        message: 'Account deletion is not yet implemented',
      };
      return c.json(error('UNAVAILABLE', 'Account deletion is not yet implemented'), 503);
    } catch (err) {
      console.error('[user.delete-account] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to delete account'), 500);
    }
  });
