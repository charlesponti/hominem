import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { adminRoutes } from './admin';
import { mobileRoutes } from './mobile';
import { searchRoutes } from './search';
import { userRoutes } from './user';
import { vectorRoutes } from './vector';
import { authenticatedVoiceRoutes } from './voice';

/**
 * System Domain
 *
 * OS infrastructure and utility services: admin, user, search, and vector.
 */
export const systemRoutes = new Hono<AppContext>()
  .route('/admin', adminRoutes)
  .route('/voice', authenticatedVoiceRoutes)
  .route('/mobile', mobileRoutes)
  .route('/user', userRoutes)
  .route('/search', searchRoutes)
  .route('/vector', vectorRoutes);
