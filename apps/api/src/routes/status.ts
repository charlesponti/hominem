import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

// Status/health endpoint
const statusPlugin: FastifyPluginAsync = async (server) => {
  // Simple health check that doesn't require authentication
  server.get('/health', async () => {
    return { status: 'ok', serverTime: new Date().toISOString() }
  })

  server.get('/status', async (request) => {
    const isAuth = !!request.userId
    const serverTime = new Date().toISOString()
    const uptime = process.uptime()

    return { up: true, isAuth, serverTime, uptime }
  })
}

export default fp(statusPlugin)
