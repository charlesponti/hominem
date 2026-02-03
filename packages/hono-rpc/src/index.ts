import type { AppContext } from './middleware/auth';

import { app } from './app';

/**
 * Export app for server setup
 */
export { app };

/**
 * App Type - use this for type-safe client instantiation
 *
 * Example usage in type inference:
 *   import type { AppType } from '@hominem/hono-rpc'
 *   import { hc } from 'hono/client'
 *
 *   type ApiClient = ReturnType<typeof hc<AppType>>
 *
 * NOTE: Re-exported from app.type.ts to defer expensive type computation
 */
export type { AppType } from './app.type';

/**
 * Routes - re-exported for convenience
 */
import { adminRoutes } from './routes/admin';
import { chatsRoutes } from './routes/chats';
import { financeRoutes } from './routes/finance';
import { goalsRoutes } from './routes/goals';
import { habitsRoutes } from './routes/habits';
import { healthRoutes } from './routes/health';
import { invitesRoutes } from './routes/invites';
import { itemsRoutes } from './routes/items';
import { listsRoutes } from './routes/lists';
import { messagesRoutes } from './routes/messages';
import { peopleRoutes } from './routes/people';
import { placesRoutes } from './routes/places';
import { tripsRoutes } from './routes/trips';
import { userRoutes } from './routes/user';

export {
  adminRoutes,
  financeRoutes,
  invitesRoutes,
  itemsRoutes,
  listsRoutes,
  peopleRoutes,
  placesRoutes,
  tripsRoutes,
  userRoutes,
  goalsRoutes,
  habitsRoutes,
  healthRoutes,
  chatsRoutes,
  messagesRoutes,
};

/**
 * Types - import directly from @hominem/hono-rpc/types
 */
export type { AppContext };
