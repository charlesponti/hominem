import { InternalError, UnavailableError } from '@hominem/services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

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
      console.warn('[user.delete-account] Not yet implemented');

      throw new UnavailableError('Account deletion is not yet implemented');
    } catch (err) {
      console.error('[user.delete-account] unexpected error:', err);
      throw new InternalError('Failed to delete account');
    }
  });
