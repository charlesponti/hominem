import { InternalError } from '@hominem/services';
import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Admin Routes
 *
 * Handles admin-only operations.
 *
 * TODO: Add admin-only middleware check
 */

// ============================================================================
// Routes
// ============================================================================

export const adminRoutes = new Hono<AppContext>()
  // Refresh Google Places data (stub implementation)
  .post('/refresh-google-places', authMiddleware, async (c) => {
    // const userId = c.get('userId')!;
    // TODO: Check if user is admin

    try {
      // TODO: Implement Google Places refresh logic
      logger.warn('[admin.refresh-google-places] Not yet implemented');

      // Stub implementation
      return c.json({ updatedCount: 0, duration: 0 }, 200);
    } catch (err) {
      logger.error('[admin.refresh-google-places] unexpected error', { error: err });
      throw new InternalError('Failed to refresh Google Places');
    }
  });
