import { clerkPlugin, getAuth } from '@clerk/fastify'
import type { FastifyPluginAsync } from 'fastify'
import { getEnv } from '../lib/env'

const setupClerkPlugin: FastifyPluginAsync = async (server) => {
  // Register Clerk plugin
  await server.register(clerkPlugin, {
    secretKey: getEnv('CLERK_SECRET_KEY'),
    publishableKey: getEnv('CLERK_PUBLISHABLE_KEY'),
  })

  // Add hook to check authentication for protected routes
  server.addHook('preHandler', async (request, reply) => {
    // Skip auth for public routes
    if (
      request.routerPath === '/status' ||
      request.routerPath === '/health' ||
      request.routerPath?.startsWith('/public')
    ) {
      return
    }

    try {
      // This will throw if the request is not authenticated
      const auth = getAuth(request)
      
      if (!auth.userId) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
      
      // Make userId available on request
      request.userId = auth.userId
    } catch (error) {
      request.log.error(error)
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  })

  // Add decorator to make userId available on request
  server.decorateRequest('userId', null)
}

export default setupClerkPlugin