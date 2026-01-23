import type { AppContext } from './middleware/auth';

import { app, type AppType } from './app';

/**
 * Export app for server setup
 */
export { app };

/**
 * App Type - use this for type-safe client instantiation
 *
 * Example usage in type inference:
 *   import type { AppType } from '@hominem/hono-rpc'
 *   import type { InferResponseType } from 'hono/client'
 *   import { hc } from 'hono/client'
 *
 *   type ApiClient = ReturnType<typeof hc<AppType>>
 *   type MyResponse = InferResponseType<ApiClient['api']['myroute']['$get']>
 */
export type { AppType };

/**
 * Routes - re-exported for convenience
 */
export { financeRoutes } from './routes/finance';
export { listsRoutes } from './routes/lists';
export { placesRoutes } from './routes/places';
export { invitesRoutes } from './routes/invites';
export { itemsRoutes } from './routes/items';
export { tripsRoutes } from './routes/trips';
export { peopleRoutes } from './routes/people';
export { userRoutes } from './routes/user';
export { adminRoutes } from './routes/admin';

/**
 * Types - re-exported for convenience
 */
export type { AppContext };
export * from './types';
