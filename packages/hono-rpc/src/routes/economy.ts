import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

import { financeRoutes } from './finance';
import { itemsRoutes } from './items';
import { listsRoutes } from './lists';

/**
 * Economy Domain
 *
 * Material and task resources: finance, items, and lists.
 */
export const economyRoutes = new Hono<AppContext>()
  .route('/finance', financeRoutes)
  .route('/items', itemsRoutes)
  .route('/lists', listsRoutes);
