import { Hono } from 'hono';

import type { AdminRefreshGooglePlacesOutput } from '../types/admin.types';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Admin Routes
 *
 * Handles admin-only operations
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

      const result: AdminRefreshGooglePlacesOutput = {
        success: false,
        updatedCount: 0,
        message: 'Google Places refresh is not yet implemented',
      };
      return c.json(result);
    } catch (error) {
      console.error('[admin.refresh-google-places]', error);
      return c.json({ error: 'Failed to refresh Google Places' }, 500);
    }
  });
