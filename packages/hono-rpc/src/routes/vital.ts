import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

import { eventsRoutes } from './events';
import { goalsRoutes } from './goals';
import { habitsRoutes } from './habits';
import { healthRoutes } from './health';

/**
 * Vital Domain
 *
 * Biological and behavioral self-management: health, habits, goals, and events.
 */
export const vitalRoutes = new Hono<AppContext>()
  .route('/health', healthRoutes)
  .route('/habits', habitsRoutes)
  .route('/goals', goalsRoutes)
  .route('/events', eventsRoutes);
