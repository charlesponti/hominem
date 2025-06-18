import { QUEUE_NAMES } from '@hominem/utils/consts'
import { redis } from '@hominem/utils/redis'
import type { users } from '@hominem/utils/schema'
import { serve } from '@hono/node-server'
import { Queue } from 'bullmq'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { env } from './lib/env.js'
import { cache } from './lib/redis.js'
import { initSentry, sentryErrorHandler, sentryMiddleware } from './lib/sentry.js'
import { createWebSocketManager } from './lib/websocket.js'

import rateLimitPlugin from './plugins/rate-limit.js'
import { aiRoutes } from './routes/ai/index.js'
import { bookmarksRoutes } from './routes/bookmarks/index.js'
import { contentStrategiesRoutes } from './routes/content-strategies.js'
import { contentRoutes } from './routes/content.js'
import { financeRoutes } from './routes/finance/index.js'
import { plaidRoutes } from './routes/finance/plaid/index.js'
import { healthRoutes } from './routes/health.js'
import { invitesRoutes } from './routes/invites/index.js'
import { listsRoutes } from './routes/lists.js'
import { locationRoutes } from './routes/location.js'
import { oauthRoutes } from './routes/oauth/index.js'
import { placesRoutes } from './routes/places/index.js'
import { possessionsRoutes } from './routes/possessions.js'
import { statusRoutes } from './routes/status.js'
import { userRoutes } from './routes/user/index.js'
import { vectorRoutes } from './routes/vector.js'

// TODO: Import other routes as they get converted to Hono
// import adminPlugin from './plugins/admin.js'
// import emailPlugin from './plugins/email.js'
// import { aiRoutes } from './routes/ai/index.js'
// import bookmarksPlugin from './routes/bookmarks/bookmarks.router.js'
// import { careerRoutes } from './routes/career.js'
// import { companyRoutes } from './routes/company.js'
// import { contentStrategiesRoutes } from './routes/content-strategies.router.js'
// import { financeRoutes } from './routes/finance/finance.router.js'
// import { plaidRoutes } from './routes/finance/plaid.router.js'
// import invitesPlugin from './routes/invites.router.js'
// import listsPlugin from './routes/lists.router.js'
// import { contentRoutes } from './routes/notes.js'
// import oauthPlugin from './routes/oauth/index.js'
// import { personalFinanceRoutes } from './routes/personal-finance.js'
// import placesPlugin from './routes/places.router.js'
// import possessionsPlugin from './routes/possessions.router.js'
// import statusPlugin from './routes/status.js'
// import usersPlugin from './routes/user.router.js'
// import { vectorRoutes } from './routes/vector.router.js'
// import webSocketPlugin from './websocket/index.js'

export interface AppEnv {
  Bindings: Record<string, unknown>
  Variables: {
    queues: {
      plaidSync: Queue
      importTransactions: Queue
    }
    userId?: string
    user?: typeof users.$inferSelect
    supabaseId?: string
    cache?: typeof cache
  }
}

export function createServer(): Hono<AppEnv> {
  // Initialize Sentry
  initSentry()

  const app = new Hono<AppEnv>()

  // Set up BullMQ queues using consistent queue names from utils/consts
  const plaidSyncQueue = new Queue(QUEUE_NAMES.PLAID_SYNC, { connection: redis })
  const importTransactionsQueue = new Queue(QUEUE_NAMES.IMPORT_TRANSACTIONS, {
    connection: redis,
  })

  // Add queues and cache to app context
  app.use('*', async (c, next) => {
    c.set('queues', {
      plaidSync: plaidSyncQueue,
      importTransactions: importTransactionsQueue,
    })
    c.set('cache', cache)
    await next()
  })

  // Set up global error handler
  app.onError((err, c) => {
    console.error('Global error handler:', err)
    sentryErrorHandler(err, c)
    return c.json({ error: err.message || 'Internal Server Error' }, 500)
  })

  // Global middleware
  app.use('*', logger())
  app.use('*', secureHeaders())
  app.use('*', sentryMiddleware())

  app.use(
    '*',
    cors({
      origin: [env.APP_URL, env.ROCCO_URL, env.NOTES_URL, env.CHAT_URL],
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // Apply rate limiting
  app.use(
    '*',
    rateLimitPlugin({
      maxHits: 100,
      segment: 'api',
      windowLength: 60000, // 1 minute
    })
  )

  // Register routes - healthRoutes, financeRoutes, listsRoutes, locationRoutes, possessionsRoutes, contentStrategiesRoutes, vectorRoutes, and invitesRoutes are converted to Hono so far
  app.route('/api/health', healthRoutes)
  app.route('/api/status', statusRoutes)
  app.route('/api/finance/plaid', plaidRoutes)
  app.route('/api/finance', financeRoutes)
  app.route('/api/lists', listsRoutes)
  app.route('/api/location', locationRoutes)
  app.route('/api/possessions', possessionsRoutes)
  app.route('/api/content-strategies', contentStrategiesRoutes)
  app.route('/api/vectors', vectorRoutes)
  app.route('/api/invites', invitesRoutes)
  app.route('/api/user', userRoutes)
  app.route('/api/places', placesRoutes)
  app.route('/api/bookmarks', bookmarksRoutes)
  app.route('/api/content', contentRoutes)
  app.route('/api/ai', aiRoutes)
  app.route('/api/oauth', oauthRoutes)

  // TODO: Convert remaining routes from Fastify plugins to Hono routes
  // app.route('/api/admin', adminPlugin)
  // app.route('/api/email', emailPlugin)
  // app.route('/api/users', usersPlugin)
  // app.route('/api/lists', listsPlugin)
  // app.route('/api/places', placesPlugin)
  // app.route('/api/invites', invitesPlugin)
  // app.route('/api/bookmarks', bookmarksPlugin)
  // app.route('/api/ai', aiRoutes)
  // app.route('/api/possessions', possessionsPlugin)
  // app.route('/api/companies', companyRoutes)
  // app.route('/api/career', careerRoutes)
  // app.route('/api/content-strategies', contentStrategiesRoutes)
  // app.route('/api/content', contentRoutes)
  // app.route('/api/oauth', oauthPlugin)
  // app.route('/api/vectors', vectorRoutes)
  // app.route('/api/finance', financeRoutes)
  // app.route('/api/personal-finance', personalFinanceRoutes)
  // app.route('/api/plaid', plaidRoutes)
  // app.route('/api/status', statusPlugin)
  // app.route('/ws', webSocketPlugin)

  return app
}

export async function startServer() {
  const app = createServer()

  const port = Number.parseInt(env.PORT, 10)
  const server = serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
  })

  // Create WebSocket manager
  const wsManager = createWebSocketManager()

  // Handle WebSocket upgrade requests
  server.on('upgrade', wsManager.handleUpgrade)

  console.log(`Server is running on port ${port}`)

  // Handle graceful shutdown
  const gracefulShutdown = async () => {
    console.log('Shutting down gracefully...')
    // Close WebSocket connections
    await wsManager.close()
    // Close cache
    await cache.quit()
    // Close server
    server.close()
    process.exit(0)
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)

  return server
}
