import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { importJobRoutes } from './finance.import.jobs';
import { importPreflightRoutes } from './finance.import.preflight';
import { importWebSocketRoutes } from './finance.import.websocket';

export const importRoutes: Hono<AppContext> = new Hono<AppContext>()
  .use('*', authMiddleware)
  .route('/', importWebSocketRoutes)
  .route('/', importJobRoutes)
  .route('/', importPreflightRoutes);
