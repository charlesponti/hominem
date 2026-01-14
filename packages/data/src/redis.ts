import Redis from 'ioredis'
import { delay, TIME_UNITS } from '@hominem/utils'
import { env } from './env'

// For compatibility with utility exports if they are not yet updated
// We might need to import specifically from files if index exports aren't clean
const REDIS_URL = env.REDIS_URL

export const redis = new Redis(REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  family: 0,
})

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
