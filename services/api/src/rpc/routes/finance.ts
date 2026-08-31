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

// Stitches together all the finance sub-routers (transactions, accounts,
// import, budget, etc.) under one router.

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
