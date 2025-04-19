import Redis from 'ioredis'
import { logger } from './logger'
import { TIME_UNITS } from './time'
import delay from './utils/delay.utils'

const { REDIS_URL } = process.env

// Create a mock Redis client if REDIS_URL is not provided
class MockRedis {
  async get() { return null }
  async set() { return 'OK' }
  async del() { return 0 }
  async zadd() { return 0 }
  async zremrangebyscore() { return 0 }
  async zcard() { return 0 }
  async quit() { return 'OK' }
  // Add subscribe method
  async subscribe() { return 'OK' }
  // Add publish method
  async publish() { return 0 }
  // Add duplicate method needed by WebSocket plugin
  duplicate() { return new MockRedis() }
  on(event: string, callback: Function) { 
    if (event === 'ready') {
      // Call the ready callback to simulate a connection
      setTimeout(() => callback(), 0)
    }
    return this
  }
  // Status property to match Redis client
  get status() { return 'ready' }
}

// Create Redis client or use mock if not available
export const redis = REDIS_URL 
  ? new Redis(`${REDIS_URL}?family=0`) 
  : new MockRedis() as unknown as Redis

// Log warning if Redis is not available
if (!REDIS_URL) {
  logger.warn('REDIS_URL not provided. Using in-memory mock implementation. Some features may be limited.')
}

const MAX_REQUESTS = 50

export async function checkRateLimit(key: string): Promise<boolean> {
  const now = Date.now()
  const windowStart = now - TIME_UNITS.MINUTE

  // Add current timestamp and remove old entries
  await redis.zadd(key, now, now.toString())
  await redis.zremrangebyscore(key, 0, windowStart)

  // Count requests in current window
  const requestCount = await redis.zcard(key)
  return requestCount <= MAX_REQUESTS
}

export async function waitForRateLimit(key: string) {
  while (!(await checkRateLimit(key))) {
    await delay(1000) // Wait 1 second before checking again
  }
}
