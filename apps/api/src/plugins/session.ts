import type { FastifyCookieOptions } from '@fastify/cookie'
import type { FastifyPluginAsync } from 'fastify'
import { env } from 'src/lib/env'

const sessionPlugin: FastifyPluginAsync = async (fastify) => {
  // Set up a simple cookie for non-auth session data if needed
  await fastify.register(require('@fastify/cookie'), {
    secret: env.COOKIE_SECRET,
    hook: 'onRequest',
    parseOptions: {},
  } as FastifyCookieOptions)
}

export default sessionPlugin
