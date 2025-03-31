import { getActiveJobs } from '@ponti/utils/imports'
import { logger } from '@ponti/utils/logger'
import { redis } from '@ponti/utils/redis'
import type { FastifyInstance } from 'fastify'
import { WebSocketServer } from 'ws'

// !TODO Move to @ponti/utils/consts
const IMPORT_PROGRESS_CHANNEL = 'import:progress'

// Create a WebSocket plugin
export async function webSocketPlugin(fastify: FastifyInstance) {
  // Create WebSocket server
  const wss = new WebSocketServer({ noServer: true })

  // Setup Redis subscriber for real-time updates
  const redisSubscriber = redis.duplicate()

  // Progress updates via Redis pub/sub
  redisSubscriber.on('message', (channel, message) => {
    if (channel === IMPORT_PROGRESS_CHANNEL) {
      try {
        const progressData = JSON.parse(message)

        // Broadcast to all connected clients
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: IMPORT_PROGRESS_CHANNEL,
                data: progressData,
              })
            )
          }
        }
      } catch (error) {
        logger.error('Error broadcasting import progress:', error)
      }
    }
  })

  // Subscribe to Redis channels
  redisSubscriber.subscribe(IMPORT_PROGRESS_CHANNEL)
  fastify.log.info(`Subscribed to Redis channel: ${IMPORT_PROGRESS_CHANNEL}`)

  // Connection handler
  wss.on('connection', (ws) => {
    fastify.log.info('WebSocket client connected')

    // Message handler
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString()) as {
          type: string
          message?: string
        }

        // Handle different message types
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }))
            break

          case 'subscribe:imports':
            ws.send(
              JSON.stringify({
                type: 'subscribed',
                channel: IMPORT_PROGRESS_CHANNEL,
                data: await getActiveJobs(),
              })
            )
            break

          case 'chat':
            // Handle chat messages
            ws.send(
              JSON.stringify({
                type: 'chat',
                message: `Received: ${data.message}`,
              })
            )
            break

          default:
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Unknown message type',
              })
            )
        }
      } catch (error) {
        fastify.log.error('Error processing WebSocket message:', error)
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          })
        )
      }
    })

    // Error handler
    ws.on('error', (error) => {
      fastify.log.error('WebSocket connection error:', error)
    })

    // Close handler
    ws.on('close', () => {
      fastify.log.info('WebSocket client disconnected')
    })

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'info',
        message: 'Connected to server',
        serverTime: new Date().toISOString(),
      })
    )
  })

  // Upgrade HTTP connection to WebSocket
  fastify.server.on('upgrade', (request, socket, head) => {
    //!TODO Add authentication/validation
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  })

  // Clean shutdown
  fastify.addHook('onClose', (instance, done) => {
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
