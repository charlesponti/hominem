import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

import { goalsRoutes } from './goals';
import { habitsRoutes } from './habits';
import { healthRoutes } from './health';
import { calendarRoutes } from './calendar';

/**
 * Vital Domain
 *
 * Biological and behavioral self-management: health, habits, goals, and calendar.
 */
export const vitalRoutes: Hono<AppContext> = new Hono<AppContext>()
  .route('/health', healthRoutes)
  .route('/habits', habitsRoutes)
  .route('/goals', goalsRoutes)
  .route('/calendar', calendarRoutes);
