import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import twitterOAuthPlugin from './twitter.router.js'

const oauthPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Register Twitter OAuth routes
  await server.register(twitterOAuthPlugin, { prefix: '/twitter' })
}

export default oauthPlugin
