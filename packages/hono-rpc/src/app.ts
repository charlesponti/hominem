import { Hono } from 'hono';

import type { AppContext } from './middleware/auth';
import { errorMiddleware } from './middleware/error';

import { adminRoutes } from './routes/admin';
import { bookmarksRoutes } from './routes/bookmarks';
import { chatsRoutes } from './routes/chats';
import { contentRoutes } from './routes/content';
import { contentStrategiesRoutes } from './routes/content-strategies';
import { eventsRoutes } from './routes/events';
import { filesRoutes } from './routes/files';
import { financeRoutes } from './routes/finance';
import { goalsRoutes } from './routes/goals';
import { invitesRoutes } from './routes/invites';
import { itemsRoutes } from './routes/items';
import { listsRoutes } from './routes/lists';
import { locationRoutes } from './routes/location';
import { messagesRoutes } from './routes/messages';
import { notesRoutes } from './routes/notes';
import { peopleRoutes } from './routes/people';
import { placesRoutes } from './routes/places';
import { searchRoutes } from './routes/search';
import { tripsRoutes } from './routes/trips';
import { tweetRoutes } from './routes/tweet';
import { twitterRoutes } from './routes/twitter';
import { userRoutes } from './routes/user';
import { vectorRoutes } from './routes/vector';

/**
 * Main Hono RPC Application
 *
 * Combines all route handlers into a single app with /api prefix.
 * This app is designed to be mounted into a larger server application.
 *
 * NOTE: AppType inference is deferred to app.type.ts to prevent
 * expensive type computation during routine type checking.
 */
export const app = new Hono<AppContext>()
  .use(errorMiddleware)  // Global error handler - MUST BE FIRST
  .basePath('/api')
  .route('/admin', adminRoutes)
  .route('/bookmarks', bookmarksRoutes)
  .route('/chats', chatsRoutes)
  .route('/content', contentRoutes)
  .route('/content-strategies', contentStrategiesRoutes)
  .route('/events', eventsRoutes)
  .route('/files', filesRoutes)
  .route('/finance', financeRoutes)
  .route('/goals', goalsRoutes)
  .route('/invites', invitesRoutes)
  .route('/items', itemsRoutes)
  .route('/lists', listsRoutes)
  .route('/location', locationRoutes)
  .route('/messages', messagesRoutes)
  .route('/notes', notesRoutes)
  .route('/people', peopleRoutes)
  .route('/places', placesRoutes)
  .route('/search', searchRoutes)
  .route('/trips', tripsRoutes)
  .route('/tweet', tweetRoutes)
  .route('/twitter', twitterRoutes)
  .route('/user', userRoutes)
  .route('/vector', vectorRoutes);
