import { REDIS_CHANNELS } from '@hominem/utils/consts'
import { redis } from '@hominem/utils/redis'
import type { FastifyInstance } from 'fastify'
import { WebSocketServer } from 'ws'
import { client, getHominemUser } from '../middleware/auth.js'
import { wsHandlers } from './handlers.js'
import { redisHandlers } from './redis-handlers.js'

const IMPORT_PROGRESS_CHANNEL = REDIS_CHANNELS.IMPORT_PROGRESS

export async function webSocketPlugin(fastify: FastifyInstance) {
  // WebSocket server. Do not need a server since this is handled by Fastify.
  const wss = new WebSocketServer({ noServer: true })

  // Setup Redis subscriber for real-time updates
  const redisSubscriber = redis.duplicate()

  // Progress updates via Redis pub/sub
  redisSubscriber.on('message', (channel, message) => {
    // Use the new Redis handler
    redisHandlers.process(wss, channel, message)
  })

  // Subscribe to Redis channels
  redisSubscriber.subscribe(IMPORT_PROGRESS_CHANNEL)
  fastify.log.info(`Subscribed to Redis channel: ${IMPORT_PROGRESS_CHANNEL}`)

  // Connection handler
  wss.on('connection', async (ws) => {
    fastify.log.info('WebSocket client connected')

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'info',
        message: 'Connected to server',
        serverTime: new Date().toISOString(),
      })
    )

    // Message handler - now using our registry
    ws.on('message', async (message) => {
      await wsHandlers.process(ws, message.toString())
    })

    // Error handler
    ws.on('error', (error) => {
      fastify.log.error('WebSocket connection error:', error)
    })

    // Close handler
    ws.on('close', () => {
      fastify.log.info('WebSocket client disconnected')
    })
  })

  // Upgrade HTTP connection to WebSocket
  fastify.server.on('upgrade', async (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, async (ws) => {
      if (!request.url) return

      // Authenticate the request
      const headers = new Headers()
      headers.append('Authorization', `Bearer ${request.url.split('token=')[1]}`)
      const req = new Request(`http://localhost:4040${request.url}`, { headers })
      const auth = await client.authenticateRequest(req)
      const u = auth.toAuth()
      const user = u?.userId ? await getHominemUser(u.userId) : null
      if (!user) {
        fastify.log.error('WebSocket authentication failed')
        socket.destroy()
        return
      }

      wss.emit('connection', ws, request)
    })
  })

  // Clean shutdown
  fastify.addHook('onClose', (_instance, done) => {
    // Clean up Redis subscription
    redisSubscriber.unsubscribe(IMPORT_PROGRESS_CHANNEL)
    redisSubscriber.quit().finally(() => {
      // Close WebSocket server
      wss.close(() => {
        fastify.log.info('WebSocket server closed')
        done()
      })
    })
  })

  // Make WebSocket server available to other plugins
  fastify.decorate('wss', wss)
}
