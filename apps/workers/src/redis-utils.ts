// Redis utilities
import { EventEmitter } from 'node:events'
import { logger } from '../../../packages/utils/src/logger.ts'

class MockRedis extends EventEmitter {
  private store: Map<string, string> = new Map()
  public status = 'ready'

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null
  }

  async set(key: string, value: string, expireMode?: string, duration?: number): Promise<'OK'> {
    this.store.set(key, value)
    return 'OK'
  }

  async incr(key: string): Promise<number> {
    const val = this.store.get(key) || '0'
    const newVal = parseInt(val, 10) + 1
    this.store.set(key, newVal.toString())
    return newVal
  }

  async expire(key: string, seconds: number): Promise<number> {
    return 1
  }

  async ttl(key: string): Promise<number> {
    return 3600
  }

  async subscribe(channel: string): Promise<void> {
    logger.info(`Subscribed to Redis channel: ${channel}`)
  }

  async publish(channel: string, message: string): Promise<number> {
    logger.info(`Publishing to ${channel}: ${message}`)
    this.emit('message', channel, message)
    return 1
  }
}

// Export a mock Redis client
export const redis = new MockRedis()