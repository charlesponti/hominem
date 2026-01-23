import { Hono } from 'hono';

import type { AppContext } from './middleware/auth';

import { adminRoutes } from './routes/admin';
import { financeRoutes } from './routes/finance';
import { invitesRoutes } from './routes/invites';
import { itemsRoutes } from './routes/items';
import { listsRoutes } from './routes/lists';
import { peopleRoutes } from './routes/people';
import { placesRoutes } from './routes/places';
import { tripsRoutes } from './routes/trips';
import { userRoutes } from './routes/user';

/**
 * Main Hono RPC Application
 *
 * Combines all route handlers into a single app with /api prefix.
 * This app is designed to be mounted into a larger server application.
 */
export const app = new Hono<AppContext>()
  .basePath('/api')
  .route('/admin', adminRoutes)
  .route('/finance', financeRoutes)
  .route('/invites', invitesRoutes)
  .route('/items', itemsRoutes)
  .route('/lists', listsRoutes)
  .route('/people', peopleRoutes)
  .route('/places', placesRoutes)
  .route('/trips', tripsRoutes)
  .route('/user', userRoutes);

/**
 * AppType - Type representing the entire API structure
 *
 * Used for type-safe client instantiation and response type inference.
 * This type captures the complete API shape including all routes and methods.
 */
export type AppType = typeof app;
