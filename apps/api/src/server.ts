import { env } from './lib/env.js'

import fastifyCircuitBreaker from '@fastify/circuit-breaker'
import type { FastifyCookieOptions } from '@fastify/cookie'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyMultipart from '@fastify/multipart'
import { QUEUE_NAMES } from '@hominem/utils/consts'
import { redis } from '@hominem/utils/redis'
import { Queue } from 'bullmq'
import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import type { ZodSchema } from 'zod'

import { handleError } from './lib/errors.js'
import adminPlugin from './plugins/admin.js'
import emailPlugin from './plugins/email.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import shutdownPlugin from './plugins/shutdown.js'
import { aiRoutes } from './routes/ai/index.js'
import bookmarksPlugin from './routes/bookmarks/bookmarks.router.js'
import { careerRoutes } from './routes/career.js'
import { companyRoutes } from './routes/company.js'
import { contentStrategiesRoutes } from './routes/content-strategies.router.js'
import { financeRoutes } from './routes/finance/finance.router.js'
import { plaidRoutes } from './routes/finance/plaid.router.js'
import { healthRoutes } from './routes/health.js'
import { invitesPlugin } from './routes/invites.router.js'
import listsPlugin from './routes/lists.router.js'
import { contentRoutes } from './routes/notes.js'
import oauthPlugin from './routes/oauth/index.js'
import { personalFinanceRoutes } from './routes/personal-finance.js'
import placesPlugin from './routes/places.router.js'
import possessionsPlugin from './routes/possessions.router.js'
import statusPlugin from './routes/status.js'
import { surveyRoutes } from './routes/surveys.js'
import usersPlugin from './routes/user.router.js'
import { vectorRoutes } from './routes/vector.router.js'
import { webSocketPlugin } from './websocket/index.js'

export async function createServer(
  opts: FastifyServerOptions = {}
): Promise<FastifyInstance | null> {
  try {
    const server = fastify(opts)

    // Set up BullMQ queues using consistent queue names from utils/consts
    const plaidSyncQueue = new Queue(QUEUE_NAMES.PLAID_SYNC, { connection: redis })
    const importTransactionsQueue = new Queue(QUEUE_NAMES.IMPORT_TRANSACTIONS, {
      connection: redis,
    })

    // Add queues to fastify instance
    server.decorate('queues', {
      plaidSync: plaidSyncQueue,
      importTransactions: importTransactionsQueue,
    })

    // Set up global error handler
    server.setErrorHandler((error, _request, reply) => {
      return handleError(error, reply)
    })

    await server.register(fastifyCors, {
      origin: [env.APP_URL, env.ROCCO_URL, env.NOTES_URL, env.CHAT_URL],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    })

    await server.register(fastifyCookie, {
      secret: env.COOKIE_SECRET,
      hook: 'onRequest',
      parseOptions: {},
    } as FastifyCookieOptions)

    await server.register(fastifyCircuitBreaker)
    await server.register(fastifyMultipart, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 1,
        fieldNameSize: 100,
        fieldSize: 1024 * 1024, // 1MB for text fields
      },
    })
    await server.register(fastifyHelmet)

    // Supabase auth is handled via JWT verification in middleware
    server.log.info('Supabase authentication enabled.')

    // Register rate limit plugin with Redis client
    await server.register(rateLimitPlugin, {
      maxHits: 100,
      segment: 'api',
      windowLength: 60000, // 1 minute
    })

    await server.register(shutdownPlugin)
    await server.register(statusPlugin)
    await server.register(emailPlugin)
    await server.register(adminPlugin)
    await server.register(usersPlugin)
    await server.register(listsPlugin)
    await server.register(placesPlugin)
    await server.register(invitesPlugin)
    await server.register(bookmarksPlugin)
    await server.register(aiRoutes, { prefix: '/api/ai' })
    await server.register(possessionsPlugin, { prefix: '/api' })
    await server.register(healthRoutes, { prefix: '/api/health' })
    await server.register(companyRoutes, { prefix: '/api/companies' })
    await server.register(careerRoutes, { prefix: '/api/career' })
    await server.register(contentStrategiesRoutes, { prefix: '/api/content-strategies' })
    await server.register(surveyRoutes, { prefix: '/api/surveys' })
    await server.register(contentRoutes, { prefix: '/api/content' })
    await server.register(oauthPlugin, { prefix: '/api/oauth' })
    await server.register(vectorRoutes, { prefix: '/api/vectors' })
    await server.register(financeRoutes, { prefix: '/api/finance' })
    await server.register(personalFinanceRoutes, { prefix: '/api/personal-finance' })
    await server.register(plaidRoutes, { prefix: '/api/plaid' })
    await server.register(webSocketPlugin)

    // --- Add onClose hooks ---
    server.addHook('onClose', async (instance) => {
      await instance.queues.plaidSync.close()
      await instance.queues.importTransactions.close()
    })
    // --- End onClose hooks ---

    server.setValidatorCompiler(({ schema }: { schema: ZodSchema }) => {
      return (data) => schema.parse(data)
    })

    server.setSerializerCompiler(({ schema }: { schema: ZodSchema }) => {
      return (data) => schema.parse(data)
    })

    return server
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function startServer() {
  const server = await createServer({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        env.NODE_ENV === 'production'
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: true,
                ignore: 'pid,hostname',
              },
            },
    },
    disableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'true',
  })

  if (!server) {
    process.exit(1)
  }

  try {
    await server.listen({ port: Number.parseInt(env.PORT, 10), host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}
