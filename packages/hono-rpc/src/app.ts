import { Hono } from 'hono';

import type { AppContext } from './middleware/auth';

import { errorMiddleware } from './middleware/error';
import { economyRoutes } from './routes/economy';
import { knowledgeRoutes } from './routes/knowledge';
import { socialRoutes } from './routes/social';
import { systemRoutes } from './routes/system';
import { vitalRoutes } from './routes/vital';
import { worldRoutes } from './routes/world';

/**
 * Build the main application with all routes explicitly registered.
 *
 * Routes are organized into six archetypal domains:
 * - vitalRoutes: Health, habits, goals, events (Human life-force)
 * - knowledgeRoutes: Notes, content, files, bookmarks, twitter (Human mind)
 * - socialRoutes: People, chats, messages, invites (Human connection)
 * - economyRoutes: Finance, items, lists (Human resource management)
 * - worldRoutes: Places, location, trips (Human movement)
 * - systemRoutes: Admin, user, search, vector (The OS infrastructure)
 *
 * This organization follows first principles of the Human OS and
 * keeps TypeScript compilation extremely fast by limiting router depth.
 *
 * @see packages/hono-rpc/src/app.type.ts for the AppType definition
 */
function buildApp() {
  return new Hono<AppContext>()
    .use(errorMiddleware)
    .basePath('/api')
    .route('', vitalRoutes)
    .route('', knowledgeRoutes)
    .route('', socialRoutes)
    .route('', economyRoutes)
    .route('', worldRoutes)
    .route('', systemRoutes);
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
