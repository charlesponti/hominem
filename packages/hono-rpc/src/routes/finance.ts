import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

import { accountsRoutes } from './finance.accounts';
import { analyzeRoutes } from './finance.analyze';
import { budgetRoutes } from './finance.budget';
import { categoriesRoutes } from './finance.categories';
import { dataRoutes } from './finance.data';
import { exportRoutes } from './finance.export';
import { institutionsRoutes } from './finance.institutions';
import { plaidRoutes } from './finance.plaid';
import { runwayRoutes } from './finance.runway';
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
 * - /categories/* - Category operations
 * - /plaid/* - Plaid integration
 * - /budget/* - Budget management
 * - /institutions/* - Financial institutions
 * - /runway/* - Runway calculations
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
  .route('/categories', categoriesRoutes)
  .route('/plaid', plaidRoutes)
  .route('/budget', budgetRoutes)
  .route('/institutions', institutionsRoutes)
  .route('/runway', runwayRoutes)
  .route('/export', exportRoutes)
  .route('/data', dataRoutes);
