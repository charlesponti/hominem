import type { HominemUser } from '@hominem/auth/server'
import { QUEUE_NAMES } from '@hominem/utils/consts'
import { redis } from '@hominem/services/redis'
import { trpcServer } from '@hono/trpc-server'
import { Queue } from 'bullmq'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { env } from './lib/env.js'
import { supabaseMiddleware } from './middleware/supabase.js'
import { aiRoutes } from './routes/ai/index.js'
import { componentsRoutes } from './routes/components/index.js'
import { healthRoutes } from './routes/health.js'
import { imagesRoutes } from './routes/images.js'
import { invitesRoutes } from './routes/invites/index.js'
import { oauthRoutes } from './routes/oauth/index.js'
import { possessionsRoutes } from './routes/possessions.js'
import { statusRoutes } from './routes/status'
import { appRouter } from './index.js'
// import { financeRoutes } from './routers/finance/index.js'
// import { plaidRoutes } from './routers/finance/plaid/index.js'

export type AppEnv = {
  Variables: {
    userId?: string
    user?: HominemUser
    supabaseId?: string
    queues: {
      plaidSync: Queue
      importTransactions: Queue
      placePhotoEnrich: Queue
    }
  }
}

export function createServer() {
  const app = new Hono<AppEnv>()

  // Set up BullMQ queues using consistent queue names.
  const plaidSyncQueue = new Queue(QUEUE_NAMES.PLAID_SYNC, {
    connection: redis as any,
  })
  const importTransactionsQueue = new Queue(QUEUE_NAMES.IMPORT_TRANSACTIONS, {
    connection: redis as any,
  })

  const placePhotoEnrichQueue = new Queue(QUEUE_NAMES.PLACE_PHOTO_ENRICH, {
    connection: redis as any,
  })

  // Add queues to the app context
  app.use('*', async (c, next) => {
    c.set('queues', {
      plaidSync: plaidSyncQueue,
      importTransactions: importTransactionsQueue,
      placePhotoEnrich: placePhotoEnrichQueue,
    })
    await next()
  })

  // Logger middleware
  app.use('*', logger())

  // Pretty JSON middleware
  app.use('*', prettyJSON())

  // CORS middleware
  app.use(
    '*',
    cors({
      origin: [env.API_URL, env.ROCCO_URL, env.NOTES_URL, env.FLORIN_URL],
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    })
  )

  // Authentication middleware
  app.use('*', supabaseMiddleware())

  // Register tRPC routes
  app.use(
    '/trpc/*',
    trpcServer({
      router: appRouter,
      createContext: (opts, c) => {
        const request = opts.req

        return {
          req: {
            header: (name: string) => {
              return request.headers.get(name) || ''
            },
          },
          queues: {
            plaidSync: plaidSyncQueue,
            importTransactions: importTransactionsQueue,
            placePhotoEnrich: placePhotoEnrichQueue,
          },
          user: c.get('user'),
          userId: c.get('userId'),
          supabaseId: c.get('supabaseId') || '',
          supabase: c.get('supabase'),
        }
      },
    })
  )

  // Register route handlers
  app.route('/api/status', statusRoutes)
  app.route('/api/health', healthRoutes)
  app.route('/api/ai', aiRoutes)
  app.route('/api/oauth', oauthRoutes)
  app.route('/api/possessions', possessionsRoutes)
  app.route('/api/invites', invitesRoutes)
  app.route('/api/images', imagesRoutes)
  app.route('/components', componentsRoutes)
  // app.route('/api/finance', financeRoutes)
  // app.route('/api/finance/plaid', plaidRoutes)

  // Root health check
  app.get('/', (c) => {
    return c.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
    })
  })

  return app
}

export async function startServer() {
  const app = createServer()
  if (!app) {
    console.error('Failed to create server')
    process.exit(1)
  }

  try {
    const { serve } = await import('@hono/node-server')
    const port = Number.parseInt(env.PORT, 10)

    serve({
      fetch: app.fetch,
      port,
      hostname: '0.0.0.0',
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}
