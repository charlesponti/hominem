import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { importWebSocketRoutes } from './finance.import.websocket';

// The preflight/jobs HTTP routes moved into apps/finance (same-origin, served
// by the finance app's own route modules). This aggregator keeps only the
// websocket progress stream, which still lives on the API origin.
export const importRoutes: Hono<AppContext> = new Hono<AppContext>()
  .use('*', authMiddleware)
  .route('/', importWebSocketRoutes);
