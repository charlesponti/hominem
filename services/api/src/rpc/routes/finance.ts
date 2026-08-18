import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { accountsRoutes } from './finance.accounts';
import { affordabilityRoutes } from './finance.affordability';
import { analyzeRoutes } from './finance.analyze';
import { budgetRoutes } from './finance.budget';
import { dataRoutes } from './finance.data';
import { exportRoutes } from './finance.export';
import { importRoutes } from './finance.import';
import { institutionsRoutes } from './finance.institutions';
import { runwayRoutes } from './finance.runway';
import { tagsRoutes } from './finance.tags';
import { transactionsRoutes } from './finance.transactions';

/**
 * Main Finance Router
 *
 * Composes all finance sub-routers into a single cohesive API.
 *
 * Routes:
 * - /transactions/* - Transaction operations
 * - /accounts/* - Account operations
 * - /analyze/* - Analytics and reporting
 * - /tags/* - Tag taxonomy operations
 * - /budget/* - Budget management
 * - /institutions/* - Financial institutions
 * - /runway/* - Runway calculations
 * - /affordability/* - Purchase affordability checks
 * - /export/* - Data export
 * - /data/* - Data management
 *
 * Performance Benefits:
 * - Each sub-router is independently maintainable
 * - Type-checking is blazing fast (explicit types, no inference)
 * - Clear separation of concerns
 * - Easy to test individual routers
 */

export const financeRoutes = new Hono<AppContext>()
  .route('/transactions', transactionsRoutes)
  .route('/accounts', accountsRoutes)
  .route('/analyze', analyzeRoutes)
  .route('/tags', tagsRoutes)
  .route('/budget', budgetRoutes)
  .route('/institutions', institutionsRoutes)
  .route('/import', importRoutes)
  .route('/runway', runwayRoutes)
  .route('/affordability', affordabilityRoutes)
  .route('/export', exportRoutes)
  .route('/data', dataRoutes);

export type AppType = typeof financeRoutes;
