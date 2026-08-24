import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { careerRoutes } from './career';
import { chatsRoutes } from './chats';
import { collectionsRoutes } from './collections';
import { enhanceRoutes } from './enhance';
import { filesRoutes } from './files';
import { financeRoutes } from './finance';
import { inboxRoutes } from './inbox';
import { memoryRoutes } from './memory';
import { notesRoutes } from './notes';
import { peopleRoutes } from './people';
import { personalRoutes } from './personal';
import { tasksRoutes } from './tasks';
import { telemetryRoutes } from './telemetry';
import { usageRoutes } from './usage';
import { voiceRoutes } from './voice';

export const economyRoutes = new Hono<AppContext>()
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
