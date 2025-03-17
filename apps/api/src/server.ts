import { clerkPlugin } from '@clerk/fastify'
import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import assert from 'node:assert'
import type { ZodSchema } from 'zod'
import { getEnv } from './lib/env'
import adminPlugin from './plugins/admin'
import bookmarksPlugin from './plugins/bookmarks'
import chatSingleResponsePlugin from './plugins/chat/single-response'
import circuitBreaker from './plugins/circuit-breaker'
import emailPlugin from './plugins/email'
import ideasPlugin from './plugins/ideas'
import invites from './plugins/invites'
import listsPlugin from './plugins/lists'
import placesPlugin from './plugins/places'
import rateLimitPlugin from './plugins/rate-limit'
import shutdownPlugin from './plugins/shutdown'
import statusPlugin from './plugins/status'
import usersPlugin from './plugins/user'
import { applicationRoutes } from './routes/applications'
import { companyRoutes } from './routes/company'
import { healthRoutes } from './routes/health'
import { jobApplicationRoutes } from './routes/job-applications'
import { notesRoutes } from './routes/notes'
import { surveyRoutes } from './routes/surveys'
import { vectorRoutes } from './routes/vector.router'

const { APP_URL, PORT } = process.env

assert(APP_URL, 'Missing APP_URL env var')

export async function createServer(
  opts: FastifyServerOptions = {}
): Promise<FastifyInstance | null> {
  try {
    const server = fastify(opts)

    await server.register(require('@fastify/cors'), {
      origin: [APP_URL],
      credentials: true,
    })
    await server.register(shutdownPlugin)
    await server.register(require('@fastify/multipart'))
    await server.register(require('@fastify/helmet'))
    await server.register(circuitBreaker)

    // Register Clerk plugin
    await server.register(clerkPlugin, {
      secretKey: getEnv('CLERK_SECRET_KEY'),
      publishableKey: getEnv('CLERK_PUBLISHABLE_KEY'),
    })
    // Register rate limit plugin with Redis client
    await server.register(rateLimitPlugin, {
      redis: server.redis,
      maxHits: 100,
      segment: 'api',
      windowLength: 60000, // 1 minute
    })

    await server.register(statusPlugin)
    await server.register(emailPlugin)
    await server.register(adminPlugin)
    await server.register(usersPlugin)
    await server.register(listsPlugin)
    await server.register(placesPlugin)
    await server.register(invites)
    await server.register(bookmarksPlugin)
    await server.register(ideasPlugin)
    await server.register(chatSingleResponsePlugin)
    await server.register(applicationRoutes, { prefix: '/api/applications' })
    await server.register(healthRoutes, { prefix: '/api/health' })
    await server.register(companyRoutes, { prefix: '/api/companies' })
    await server.register(jobApplicationRoutes, { prefix: '/api/job-applications' })
    await server.register(surveyRoutes, { prefix: '/api/surveys' })
    await server.register(notesRoutes, { prefix: '/api/notes' })
    await server.register(vectorRoutes, { prefix: '/api/vectors' })

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
    logger: true,
    disableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'true',
  })

  if (!server) {
    process.exit(1)
  }

  if (!PORT) {
    server.log.error('Missing PORT env var')
    process.exit(1)
  }

  try {
    await server.listen({ port: +PORT, host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}
