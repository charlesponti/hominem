import type { FastifyPluginAsync } from 'fastify'

const logoutPlugin: FastifyPluginAsync = async function logoutPlugin(server) {
  server.post('/logout', {}, async (request, reply) => {
    request.session.delete()
    return reply.code(200).send()
  })
}

export default logoutPlugin
