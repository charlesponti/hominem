import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { careerRoutes } from './career';
import { chatsRoutes } from './chats';
import { enhanceRoutes } from './enhance';
import { filesRoutes } from './files';
import { financeRoutes } from './finance';
import { inboxRoutes } from './inbox';
import { notesRoutes } from './notes';
import { peopleRoutes } from './people';
import { personalRoutes } from './personal';
import { tasksRoutes } from './tasks';
import { usageRoutes } from './usage';
import { voiceRoutes } from './voice';

export const economyRoutes = new Hono<AppContext>()
  .route('/career', careerRoutes)
  .route('/chats', chatsRoutes)
  .route('/enhance', enhanceRoutes)
  .route('/files', filesRoutes)
  .route('/finance', financeRoutes)
  .route('/inbox', inboxRoutes)
  .route('/notes', notesRoutes)
  .route('/people', peopleRoutes)
  .route('/personal', personalRoutes)
  .route('/tasks', tasksRoutes)
  .route('/usage', usageRoutes)
  .route('/voice', voiceRoutes);
