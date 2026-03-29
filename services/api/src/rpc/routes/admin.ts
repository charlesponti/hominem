import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import { InternalError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Admin Routes
 *
 * These routes currently require authentication only.
 */

// ============================================================================
// Routes
// ============================================================================

export const adminRoutes = new Hono<AppContext>()
  // Refresh Google Places data (stub implementation)
  .post('/refresh-google-places', authMiddleware, async (c) => {
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
