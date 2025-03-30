import { redis } from './redis'
import { TIME_UNITS } from './time'
import delay from './utils/delay.utils'

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
