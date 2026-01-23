import { Hono } from 'hono';

import type { UserDeleteAccountOutput } from '../types/user.types';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * User Routes
 *
 * Handles user account operations
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

      const result: UserDeleteAccountOutput = {
        success: false,
        message: 'Account deletion is not yet implemented',
      };
      return c.json(result);
    } catch (error) {
      console.error('[user.delete-account]', error);
      return c.json({ error: 'Failed to delete account' }, 500);
    }
  });
