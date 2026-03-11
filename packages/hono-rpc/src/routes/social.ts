import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

import { chatsRoutes } from './chats';
import { invitesRoutes } from './invites';
import { messagesRoutes } from './messages';
import { reviewRoutes } from './review';

/**
 * Social Domain
 *
 * Interpersonal connection and communication: chats, messages, and invites.
 */
export const socialRoutes = new Hono<AppContext>()
  .route('/chats', chatsRoutes)
  .route('/messages', messagesRoutes)
  .route('/invites', invitesRoutes)
  .route('/review', reviewRoutes);
