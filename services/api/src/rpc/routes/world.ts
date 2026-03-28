import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { locationRoutes } from './location';

/**
 * World Domain
 *
 * Physical and situational context: places, location, and trips.
 */
export const worldRoutes = new Hono<AppContext>().route('/location', locationRoutes);
