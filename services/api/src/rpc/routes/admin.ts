import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import { InternalError } from '../errors';
import { adminMiddleware, type AppContext } from '../middleware/auth';

/**
 * Admin Routes
 *
 * All routes require isAdmin = true — enforced by adminMiddleware.
 */

// ============================================================================
// Routes
// ============================================================================

export const adminRoutes = new Hono<AppContext>()
  // Refresh Google Places data (stub implementation)
  .post('/refresh-google-places', adminMiddleware, async (c) => {
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
