import { QUEUE_NAMES } from '@hominem/utils/consts'
import { redis } from '@hominem/utils/redis'
import type { users } from '@hominem/utils/schema'
import { serve } from '@hono/node-server'
import { trpcServer } from '@hono/trpc-server'
import { Queue } from 'bullmq'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { env } from './lib/env.js'
import { cache } from './lib/redis.js'
import { initSentry, sentryErrorHandler, sentryMiddleware } from './lib/sentry.js'
import { createWebSocketManager } from './lib/websocket.js'
import { rateLimit, rateLimitIp } from './middleware/rate-limit.js'
import { supabaseMiddleware } from './middleware/supabase.js'
import { aiRoutes } from './routes/ai/index.js'
import { componentsRoutes } from './routes/components/index.js'
import { financeRoutes } from './routes/finance/index.js'
import { plaidRoutes } from './routes/finance/plaid/index.js'
import { goalsRoutes } from './routes/goals.js'
import { healthRoutes } from './routes/health.js'
import { invitesRoutes } from './routes/invites/index.js'
import { listsRoutes } from './routes/lists.js'
import { oauthRoutes } from './routes/oauth/index.js'
import { possessionsRoutes } from './routes/possessions.js'
import { statusRoutes } from './routes/status.js'
import { appRouter } from './routes/trpc.js'
import { userRoutes } from './routes/user/index.js'
import { vectorRoutes } from './routes/vector.js'

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
  app.use('*', supabaseMiddleware())
  app.use('*', rateLimit)
  app.use('*', rateLimitIp)

  app.use(
    '*',
    cors({
      origin: [env.FLORIN_URL, env.ROCCO_URL, env.NOTES_URL, env.CHAT_URL],
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
  )

  app.route('/api/health', healthRoutes)
  app.route('/api/status', statusRoutes)
  app.route('/api/components', componentsRoutes)
  app.route('/components', componentsRoutes)
  app.route('/api/finance/plaid', plaidRoutes)
  app.route('/api/finance', financeRoutes)
  app.route('/api/lists', listsRoutes)
  app.route('/api/possessions', possessionsRoutes)
  app.route('/api/vectors', vectorRoutes)
  app.route('/api/invites', invitesRoutes)
  app.route('/api/user', userRoutes)
  app.route('/api/ai', aiRoutes)
  app.route('/api/oauth', oauthRoutes)
  app.route('/api/goals', goalsRoutes)

  app.use(
    '/trpc/*',
    trpcServer({
      router: appRouter,
      createContext: (opts, c) => {
        return {
          req: c.req,
        }
      },
      onError: ({ error, path, input }) => {
        console.error(`tRPC error on path ${path}:`, {
          error,
          input,
        })
      },
    })
  )

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

  console.info(`Server is running on port ${port}`)

  // Handle graceful shutdown
  const gracefulShutdown = async () => {
    console.info('Shutting down gracefully...')
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
