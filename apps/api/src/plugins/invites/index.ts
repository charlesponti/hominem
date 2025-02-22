import type { FastifyPluginAsync } from 'fastify'
import fastifyPlugin from 'fastify-plugin'

// Routes
import getUserInvitesRoute from './get'

const invitesPlugin: FastifyPluginAsync = async (server) => {
  getUserInvitesRoute(server)
}

export default fastifyPlugin(invitesPlugin)
