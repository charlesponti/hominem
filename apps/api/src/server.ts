import { clerkPlugin } from '@clerk/fastify'
import fastifyCircuitBreaker from '@fastify/circuit-breaker'
import type { FastifyCookieOptions } from '@fastify/cookie'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyMultipart from '@fastify/multipart'
import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import type { ZodSchema } from 'zod'
import { QUEUE_NAMES } from '@hominem/utils/consts'
import { Queue } from 'bullmq'

import { env } from './lib/env'
import adminPlugin from './plugins/admin'
import bookmarksPlugin from './plugins/bookmarks'
import emailPlugin from './plugins/email'
import googlePlugin from './plugins/google'
import { invitesPlugin } from './plugins/invites'
import listsPlugin from './plugins/lists'
import placesPlugin from './plugins/places'
import possessionsPlugin from './plugins/possessions'
import rateLimitPlugin from './plugins/rate-limit'
import shutdownPlugin from './plugins/shutdown'
import { chatPlugin } from './routes/chat.router'
import { companyRoutes } from './routes/company'
import { emailMaskRoutes } from './routes/email-mask'
import { financeRoutes } from './routes/finance.router'
import { healthRoutes } from './routes/health'
import { jobApplicationRoutes } from './routes/job-applications'
import { notesRoutes } from './routes/notes'
import { personalFinanceRoutes } from './routes/personal-finance'
import { plaidRoutes } from './routes/plaid.router'
import statusPlugin from './routes/status'
import { surveyRoutes } from './routes/surveys'
import usersPlugin from './routes/user.router'
import { vectorRoutes } from './routes/vector.router'
import { webSocketPlugin } from './websocket'

// Use the existing Redis connection from @hominem/utils
import { redis } from '@hominem/utils/redis'

// Define queue interface on FastifyInstance
declare module 'fastify' {
  interface FastifyInstance {
    queues: {
      plaidSync: Queue
      importTransactions: Queue
    }
  }
}

export async function createServer(
  opts: FastifyServerOptions = {}
): Promise<FastifyInstance | null> {
  try {
    const server = fastify(opts)

    // Set up BullMQ queues using consistent queue names from utils/consts
    const plaidSyncQueue = new Queue(QUEUE_NAMES.PLAID_SYNC, { connection: redis })
    const importTransactionsQueue = new Queue(QUEUE_NAMES.IMPORT_TRANSACTIONS, { connection: redis })
    
    // Add queues to fastify instance
    server.decorate('queues', {
      plaidSync: plaidSyncQueue,
      importTransactions: importTransactionsQueue,
    })

    await server.register(fastifyCors, {
      origin: [env.APP_URL?.split(',')],
      credentials: true,
    })

    await server.register(fastifyCookie, {
      secret: env.COOKIE_SECRET,
      hook: 'onRequest',
      parseOptions: {},
    } as FastifyCookieOptions)

    await server.register(fastifyCircuitBreaker)
    await server.register(fastifyMultipart)
    await server.register(fastifyHelmet)

    // Register Clerk plugin if keys are provided and not empty
    if (
      env.CLERK_SECRET_KEY &&
      env.CLERK_PUBLISHABLE_KEY &&
      env.CLERK_SECRET_KEY !== '' &&
      env.CLERK_PUBLISHABLE_KEY !== ''
    ) {
      await server.register(clerkPlugin, {
        secretKey: env.CLERK_SECRET_KEY,
        publishableKey: env.CLERK_PUBLISHABLE_KEY,
      })
    } else {
      server.log.warn('Clerk keys are not provided. Authentication is disabled.')
    }

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
    await server.register(possessionsPlugin, { prefix: '/api' })
    await server.register(googlePlugin, { prefix: '/api/google' })
    await server.register(healthRoutes, { prefix: '/api/health' })
    await server.register(companyRoutes, { prefix: '/api/companies' })
    await server.register(jobApplicationRoutes, { prefix: '/api/job-applications' })
    await server.register(chatPlugin, { prefix: '/api/chat' })
    await server.register(surveyRoutes, { prefix: '/api/surveys' })
    await server.register(notesRoutes, { prefix: '/api/notes' })
    await server.register(vectorRoutes, { prefix: '/api/vectors' })
    await server.register(emailMaskRoutes, { prefix: '/api/email-mask' })
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