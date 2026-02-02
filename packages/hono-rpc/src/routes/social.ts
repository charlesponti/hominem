import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

import { chatsRoutes } from './chats';
import { invitesRoutes } from './invites';
import { messagesRoutes } from './messages';
import { peopleRoutes } from './people';

/**
 * Social Domain
 *
 * Interpersonal connection and communication: people, chats, messages, and invites.
 */
export const socialRoutes = new Hono<AppContext>()
  .route('/people', peopleRoutes)
  .route('/chats', chatsRoutes)
  .route('/messages', messagesRoutes)
  .route('/invites', invitesRoutes);
