import { REDIS_CHANNELS } from '@hominem/utils/consts'
import { logger } from '@hominem/utils/logger'
import type { WebSocketServer } from 'ws'

// Define Redis message handler types
export interface RedisMessage {
  // Define structure based on expected Redis message format
  // For now, assuming it's a string that needs parsing
  [key: string]: unknown
}

export type RedisMessageHandler = (wss: WebSocketServer, message: RedisMessage) => Promise<void>

// Create handler registry for Redis messages
class RedisMessageHandlerRegistry {
  private handlers: Map<string, RedisMessageHandler> = new Map()

  // Register a handler for a specific Redis channel
  register(channel: string, handler: RedisMessageHandler): this {
    this.handlers.set(channel, handler)
    return this
  }

  // Process a Redis message
  async process(wss: WebSocketServer, channel: string, rawMessage: string): Promise<void> {
    try {
      const message = JSON.parse(rawMessage) as RedisMessage
      const handler = this.handlers.get(channel)

      if (handler) {
        await handler(wss, message)
      } else {
        logger.warn(`No handler registered for Redis channel: ${channel}`)
      }
    } catch (error) {
      logger.error('Error processing Redis message:', error)
      // Decide if a generic error message should be sent to clients
      // For now, just logging server-side
    }
  }
}

// Create and export the registry
export const redisHandlers = new RedisMessageHandlerRegistry()

// Example: Handler for IMPORT_PROGRESS_CHANNEL
redisHandlers.register(REDIS_CHANNELS.IMPORT_PROGRESS, async (wss, progressData) => {
  // Broadcast to all connected clients
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: REDIS_CHANNELS.IMPORT_PROGRESS,
          data: progressData,
        })
      )
    }
  }
})
