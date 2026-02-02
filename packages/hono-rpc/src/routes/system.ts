import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

import { adminRoutes } from './admin';
import { searchRoutes } from './search';
import { userRoutes } from './user';
import { vectorRoutes } from './vector';

/**
 * System Domain
 *
 * OS infrastructure and utility services: admin, user, search, and vector.
 */
export const systemRoutes = new Hono<AppContext>()
  .route('/admin', adminRoutes)
  .route('/user', userRoutes)
  .route('/search', searchRoutes)
  .route('/vector', vectorRoutes);
