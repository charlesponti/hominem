import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { chatGenerationRoutes, chatStartGenerationRoute } from './chats.generation';
import { chatMessageRoutes } from './chats.message';
import { chatResourceRoutes, chatCollectionRoutes } from './chats.resource';
import { chatSourceRoutes } from './chats.source';
import { chatSpeechRoutes } from './chats.speech';

const chatByIdRoutes = new Hono<AppContext>()
  .use('/stream', rateLimitMiddleware({ bucket: 'chat-stream', windowSec: 60, max: 30 }))
  .route('/', chatResourceRoutes)
  .route('/', chatMessageRoutes)
  .route('/', chatSourceRoutes)
  .route('/', chatSpeechRoutes)
  .route('/', chatGenerationRoutes);

export const chatsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .route('/', chatCollectionRoutes)
  .route('/start-stream', chatStartGenerationRoute)
  .route('/:id', chatByIdRoutes);
