import { error, success } from '@hominem/services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Admin Routes
 *
 * Handles admin-only operations using the ApiResult pattern:
 * - Services throw typed errors
 * - HTTP endpoints catch errors and return ApiResult
 * - Clients receive discriminated union with `success` field
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
      console.warn('[admin.refresh-google-places] Not yet implemented');

      // Stub implementation
      return c.json(success({ updatedCount: 0, duration: 0 }), 200);
    } catch (err) {
      console.error('[admin.refresh-google-places] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to refresh Google Places'), 500);
    }
  });
