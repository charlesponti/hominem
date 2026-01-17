import { redis } from '@hominem/services/redis'
import type { Context, Next } from 'hono'

const IMPORT_RATE_LIMIT_PREFIX = 'ratelimit:import:'
const IMPORT_RATE_LIMIT_WINDOW = 60 * 60 // 1 hour
const IMPORT_RATE_LIMIT_MAX = 10 // Max 10 imports per hour

const API_RATE_LIMIT_PREFIX = 'ratelimit:api:'
const API_RATE_LIMIT_WINDOW = 60 // 1 minute
const API_RATE_LIMIT_MAX = 60 // Max 60 requests per minute

const IP_RATE_LIMIT_PREFIX = 'ratelimit:ip:'
const IP_RATE_LIMIT_WINDOW = 60 // 1 minute
const IP_RATE_LIMIT_MAX = 100 // Max 100 requests per minute

interface RateLimiterOptions {
  prefix: string
  window: number
  max: number
  limiter: 'ip' | 'user'
}

function createRateLimiter(options: RateLimiterOptions) {
  return async (c: Context, next: Next) => {
    const { prefix, window, max, limiter } = options
    let id: string | undefined

    if (limiter === 'user') {
      id = c.get('userId') ?? undefined
    } else {
      id = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    }

    if (!id) {
      await next()
      return
    }

    const key = `${prefix}${id}`
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.expire(key, window)
    }

    if (count > max) {
      return c.json({ error: 'Rate limit exceeded. Try again later.' }, 429)
    }

    c.res.headers.set('X-RateLimit-Limit', max.toString())
    c.res.headers.set('X-RateLimit-Remaining', Math.max(0, max - count).toString())

    return next()
  }
}

export const rateLimit = createRateLimiter({
  prefix: API_RATE_LIMIT_PREFIX,
  window: API_RATE_LIMIT_WINDOW,
  max: API_RATE_LIMIT_MAX,
  limiter: 'user',
})

export const rateLimitImport = createRateLimiter({
  prefix: IMPORT_RATE_LIMIT_PREFIX,
  window: IMPORT_RATE_LIMIT_WINDOW,
  max: IMPORT_RATE_LIMIT_MAX,
  limiter: 'user',
})

export const rateLimitIp = createRateLimiter({
  prefix: IP_RATE_LIMIT_PREFIX,
  window: IP_RATE_LIMIT_WINDOW,
  max: IP_RATE_LIMIT_MAX,
  limiter: 'ip',
})
