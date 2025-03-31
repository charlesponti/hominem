import { clerkPlugin } from '@clerk/fastify'
import type { FastifyCookieOptions } from '@fastify/cookie'
import fastifyCookie from '@fastify/cookie'
import { LOGGER_OPTIONS } from '@ponti/utils/logger'
import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import type { ZodSchema } from 'zod'

import { env } from './lib/env'
import adminPlugin from './plugins/admin'
import bookmarksPlugin from './plugins/bookmarks'
import emailPlugin from './plugins/email'
import { invitesPlugin } from './plugins/invites'
import listsPlugin from './plugins/lists'
import placesPlugin from './plugins/places'
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
import statusPlugin from './routes/status'
import { surveyRoutes } from './routes/surveys'
import usersPlugin from './routes/user.router'
import { vectorRoutes } from './routes/vector.router'
import { webSocketPlugin } from './websocket'

// Add cache declaration to extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    cache?: {
      get: (key: string) => Promise<string | null>
      set: (key: string, value: string, ttl?: number) => Promise<void>
      del: (key: string) => Promise<void>
    }
  }
}

export async function createServer(
  opts: FastifyServerOptions = {}
): Promise<FastifyInstance | null> {
  try {
    const server = fastify(opts)

    await server.register(require('@fastify/cors'), {
      origin: [env.APP_URL?.split(',')],
      credentials: true,
    })

    await server.register(fastifyCookie, {
      secret: env.COOKIE_SECRET,
      hook: 'onRequest',
      parseOptions: {},
    } as FastifyCookieOptions)

    await server.register(require('@fastify/circuit-breaker'))
    await server.register(require('@fastify/multipart'))
    await server.register(require('@fastify/helmet'))

    // Register Clerk plugin
    await server.register(clerkPlugin, {
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    })

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
    await server.register(webSocketPlugin)

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
    logger: LOGGER_OPTIONS,
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
