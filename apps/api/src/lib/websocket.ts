import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import { REDIS_CHANNELS } from '@hominem/utils/consts'
import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/utils/redis'
import type Redis from 'ioredis'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'
import { getHominemUser } from '../middleware/supabase.js'
import { wsHandlers } from '../websocket/handlers.js'
import { redisHandlers } from '../websocket/redis-handlers.js'

const IMPORT_PROGRESS_CHANNEL = REDIS_CHANNELS.IMPORT_PROGRESS

export interface WebSocketManager {
  wss: WebSocketServer
  redisSubscriber: Redis
  handleUpgrade: (request: IncomingMessage, socket: Duplex, head: Buffer) => void
  close: () => Promise<void>
}

export function createWebSocketManager(): WebSocketManager {
  // WebSocket server
  const wss = new WebSocketServer({ noServer: true })

  // Setup Redis subscriber for real-time updates
  const redisSubscriber = redis.duplicate()

  // Progress updates via Redis pub/sub
  redisSubscriber.on('message', (channel: string, message: string) => {
    try {
      redisHandlers.process(wss, channel, message)
    } catch (error) {
      logger.error('Redis message handler error:', error)
    }
  })

  // Subscribe to Redis channels
  redisSubscriber.subscribe(IMPORT_PROGRESS_CHANNEL)
  logger.info(`Subscribed to Redis channel: ${IMPORT_PROGRESS_CHANNEL}`)

  // Connection handler
  wss.on('connection', async (ws: WebSocket) => {
    logger.info('WebSocket client connected')

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'info',
        message: 'Connected to server',
        serverTime: new Date().toISOString(),
      })
    )

    // Message handler
    ws.on('message', async (message) => {
      try {
        await wsHandlers.process(ws, message.toString())
      } catch (error) {
        logger.error('WebSocket message handler error:', error)
        // Optionally send error response to client
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Failed to process message',
          })
        )
      }
    })

    // Error handler
    ws.on('error', (error) => {
      logger.error('WebSocket connection error:', error)
    })

    // Close handler
    ws.on('close', () => {
      logger.info('WebSocket client disconnected')
    })
  })

  // Upgrade HTTP connection to WebSocket
  const handleUpgrade = async (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    wss.handleUpgrade(request, socket, head, async (ws: WebSocket) => {
      if (!request.url) return

      // Extract token from URL
      const url = new URL(request.url, 'http://localhost')
      const token = url.searchParams.get('token')

      if (!token) {
        logger.error('WebSocket authentication failed: no token provided')
        socket.destroy()
        return
      }

      try {
        // Authenticate with Supabase
        const hominemUser = await getHominemUser(token)

        if (!hominemUser) {
          logger.error('WebSocket authentication failed: invalid token or user not found')
          socket.destroy()
          return
        }

        wss.emit('connection', ws, request)
      } catch (error) {
        logger.error('WebSocket authentication error:', error)
        socket.destroy()
        return
      }
    })
  }

  // Clean shutdown
  const close = async (): Promise<void> => {
    return new Promise((resolve) => {
      // Clean up Redis subscription
      redisSubscriber.unsubscribe(IMPORT_PROGRESS_CHANNEL)
      redisSubscriber
        .quit()
        .then(() => {
          logger.info('Redis subscriber closed successfully')
        })
        .catch((error) => {
          logger.error('Error closing Redis subscriber:', error)
        })
        .finally(() => {
          // Close WebSocket server
          wss.close(() => {
            logger.info('WebSocket server closed')
            resolve()
          })
        })
    })
  }

  return {
    wss,
    redisSubscriber,
    handleUpgrade,
    close,
  }
}
