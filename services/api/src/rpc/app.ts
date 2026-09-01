import { Hono } from 'hono';

import { requestIdMiddleware } from './middleware/auth';
import type { AppContext } from './middleware/auth';
import { apiErrorHandler } from './middleware/error';
import { validationErrorMiddleware } from './middleware/validation';
import { careerRoutes } from './routes/career';
import { chatsRoutes } from './routes/chats';
import { collectionsRoutes } from './routes/collections';
import { enhanceRoutes } from './routes/enhance';
import { filesRoutes } from './routes/files';
import { financeRoutes } from './routes/finance';
import { inboxRoutes } from './routes/inbox';
import { memoryRoutes } from './routes/memory';
import { notesRoutes } from './routes/notes';
import { peopleRoutes } from './routes/people';
import { personalRoutes } from './routes/personal';
import { tasksRoutes } from './routes/tasks';
import { telemetryRoutes } from './routes/telemetry';
import { usageRoutes } from './routes/usage';
import { voiceRoutes } from './routes/voice';

export const rpcRoutes = new Hono<AppContext>()
  .route('/career', careerRoutes)
  .route('/chats', chatsRoutes)
  .route('/collections', collectionsRoutes)
  .route('/enhance', enhanceRoutes)
  .route('/files', filesRoutes)
  .route('/finance', financeRoutes)
  .route('/inbox', inboxRoutes)
  .route('/memory', memoryRoutes)
  .route('/notes', notesRoutes)
  .route('/people', peopleRoutes)
  .route('/personal', personalRoutes)
  .route('/tasks', tasksRoutes)
  .route('/telemetry', telemetryRoutes)
  .route('/usage', usageRoutes)
  .route('/voice', voiceRoutes);

export const rpcApp = new Hono<AppContext>()
  .onError(apiErrorHandler)
  .use(requestIdMiddleware)
  .use(validationErrorMiddleware)
  .basePath('/api')
  .route('', rpcRoutes);

export type AppType = typeof rpcApp;
