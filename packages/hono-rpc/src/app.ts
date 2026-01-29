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

const routeEntries = [
  ['/admin', adminRoutes],
  ['/bookmarks', bookmarksRoutes],
  ['/chats', chatsRoutes],
  ['/content', contentRoutes],
  ['/content-strategies', contentStrategiesRoutes],
  ['/events', eventsRoutes],
  ['/files', filesRoutes],
  ['/finance', financeRoutes],
  ['/goals', goalsRoutes],
  ['/invites', invitesRoutes],
  ['/items', itemsRoutes],
  ['/lists', listsRoutes],
  ['/location', locationRoutes],
  ['/messages', messagesRoutes],
  ['/notes', notesRoutes],
  ['/people', peopleRoutes],
  ['/places', placesRoutes],
  ['/search', searchRoutes],
  ['/trips', tripsRoutes],
  ['/tweet', tweetRoutes],
  ['/twitter', twitterRoutes],
  ['/user', userRoutes],
  ['/vector', vectorRoutes],
] as const;

function buildApp() {
  const app = new Hono<AppContext>().use(errorMiddleware).basePath('/api');
  for (const [path, routes] of routeEntries) {
    app.route(path, routes);
  }
  return app;
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
