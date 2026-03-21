import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

import { locationRoutes } from './location';
import { placesRoutes } from './places';
import { tripsRoutes } from './trips';

/**
 * World Domain
 *
 * Physical and situational context: places, location, and trips.
 */
export const worldRoutes = new Hono<AppContext>()
  .route('/places', placesRoutes)
  .route('/location', locationRoutes)
  .route('/trips', tripsRoutes);
