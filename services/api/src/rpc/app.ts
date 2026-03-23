import { Hono } from 'hono'

import type { AppContext } from './middleware/auth'

import { apiErrorHandler } from './middleware/error'
import { requestIdMiddleware } from './middleware/auth'
import { validationErrorMiddleware } from './middleware/validation'
import { economyRoutes } from './routes/economy'
import { focusRoutes } from './routes/focus'
import { knowledgeRoutes } from './routes/knowledge'
import { socialRoutes } from './routes/social'
import { systemRoutes } from './routes/system'
import { vitalRoutes } from './routes/vital'
import { worldRoutes } from './routes/world'

export const rpcApp = new Hono<AppContext>()
  .onError(apiErrorHandler)
  .use(requestIdMiddleware)
  .use(validationErrorMiddleware)
  .basePath('/api')
  .route('', vitalRoutes)
  .route('', knowledgeRoutes)
  .route('', socialRoutes)
  .route('', economyRoutes)
  .route('', worldRoutes)
  .route('', systemRoutes)
  .route('/focus', focusRoutes)
