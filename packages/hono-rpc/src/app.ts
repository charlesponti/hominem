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
 * Build the main application with all routes explicitly registered.
 *
 * Routes are registered using explicit .route() chaining (not a dynamic loop)
 * to ensure TypeScript can serialize the complete route structure into
 * declaration files. This fixes the "unknown type" issues that occur when
 * routes are registered dynamically and lost during .d.ts generation.
 *
 * @see packages/hono-rpc/src/app.type.ts for the AppType definition
 */
function buildApp() {
  return new Hono<AppContext>()
    .use(errorMiddleware)
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
}

/**
 * Main Hono RPC Application
 *
 * Combines all route handlers into a single app with /api prefix.
 * This app is designed to be mounted into a larger server application.
 *
 * NOTE: AppType inference is deferred to app.type.ts to prevent
 * expensive type computation during routine type checking.
 */
export const app = buildApp();
