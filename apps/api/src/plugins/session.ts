import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

// This plugin is kept for compatibility with existing code but will use Clerk for auth
// You can remove this completely if not needed for other session data
const sessionPlugin: FastifyPluginAsync = async (server) => {
  // Set up a simple cookie for non-auth session data if needed
  // Clerk handles the authentication cookies
  server.register(require('@fastify/cookie'), {
    hook: 'onRequest',
    parseOptions: {},
  })
}

export default fp(sessionPlugin)
