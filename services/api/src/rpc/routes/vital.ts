import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { goalsRoutes } from './goals';
import { habitsRoutes } from './habits';
import { healthRoutes } from './health';

/**
 * Vital Domain
 *
 * Biological and behavioral self-management: health, habits, and goals.
 */
export const vitalRoutes: Hono<AppContext> = new Hono<AppContext>()
  .route('/health', healthRoutes)
  .route('/habits', habitsRoutes)
  .route('/goals', goalsRoutes);
