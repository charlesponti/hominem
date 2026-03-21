import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

import { listMutationRoutes } from './lists.mutation';
import { listQueryRoutes } from './lists.query';

/**
 * Lists Routes
 *
 * Handles all list-related operations. Split into queries and mutations
 * to optimize TypeScript compilation speed (< 1s per file).
 */
export const listsRoutes = new Hono<AppContext>()
  .route('', listQueryRoutes)
  .route('', listMutationRoutes);
