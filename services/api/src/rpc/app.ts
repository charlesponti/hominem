import { Hono } from 'hono';

import type { AppContext } from './middleware/auth';
import { requestIdMiddleware } from './middleware/auth';
import { apiErrorHandler } from './middleware/error';
import { validationErrorMiddleware } from './middleware/validation';
import { economyRoutes } from './routes/economy';

export const rpcApp = new Hono<AppContext>()
  .onError(apiErrorHandler)
  .use(requestIdMiddleware)
  .use(validationErrorMiddleware)
  .basePath('/api')
  .route('', economyRoutes);

export type AppType = typeof rpcApp;
