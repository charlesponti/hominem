import { QUEUE_NAMES } from '@hominem/utils/consts'
import { redis } from '@hominem/utils/redis'
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
import { invitesRoutes } from './routes/invites/index.js'
import { oauthRoutes } from './routes/oauth/index.js'
import { possessionsRoutes } from './routes/possessions.js'
// Import route handlers
import { statusRoutes } from './routes/status'
// Import tRPC router
import { appRouter } from './trpc/index.js'
// Import finance routes
import { financeRoutes } from './trpc/routers/finance/index.js'
import { plaidRoutes } from './trpc/routers/finance/plaid/index.js'

// Define the app environment type
export type AppEnv = {
  Bindings: {
    queues: {
      plaidSync: Queue
      importTransactions: Queue
    }
  }
  Variables: {
    userId?: string
    user?: unknown
    supabaseId?: string
  }
}

export function createServer(): Hono<AppEnv> | null {
  try {
    const app = new Hono<AppEnv>()

    // Set up BullMQ queues using consistent queue names from utils/consts
    const plaidSyncQueue = new Queue(QUEUE_NAMES.PLAID_SYNC, { connection: redis })
    const importTransactionsQueue = new Queue(QUEUE_NAMES.IMPORT_TRANSACTIONS, {
      connection: redis,
    })

    // Add queues to the app context
    app.use('*', async (c, next) => {
      c.set('queues', {
        plaidSync: plaidSyncQueue,
        importTransactions: importTransactionsQueue,
      })
      await next()
    })

    // Add middleware
    app.use('*', logger())
    app.use('*', prettyJSON())

    // CORS middleware
    app.use(
      '*',
      cors({
        origin: [env.API_URL, env.ROCCO_URL, env.NOTES_URL, env.CHAT_URL],
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
            },
            user: c.get('user'),
            userId: c.get('userId'),
            supabaseId: c.get('supabaseId') || '',
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
    app.route('/components', componentsRoutes)
    app.route('/api/finance', financeRoutes)
    app.route('/api/finance/plaid', plaidRoutes)

    // Root health check
    app.get('/', (c) => {
      return c.json({
        status: 'ok',
        serverTime: new Date().toISOString(),
        uptime: process.uptime(),
      })
    })

    return app
  } catch (error) {
    console.error('Failed to create server:', error)
    return null
  }
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
