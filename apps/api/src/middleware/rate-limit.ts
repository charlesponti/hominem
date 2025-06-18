import { redis } from '@hominem/utils/redis'
import type { Context, Next } from 'hono'

const IMPORT_RATE_LIMIT_PREFIX = 'ratelimit:import:'
const IMPORT_RATE_LIMIT_WINDOW = 60 * 60 // 1 hour
const IMPORT_RATE_LIMIT_MAX = 10 // Max 10 imports per hour

const API_RATE_LIMIT_PREFIX = 'ratelimit:api:'
const API_RATE_LIMIT_WINDOW = 60 // 1 minute
const API_RATE_LIMIT_MAX = 60 // Max 60 requests per minute

/**
 * Apply rate limiting to general API requests
 */
export async function rateLimit(c: Context, next: Next) {
  const userId = c.get('userId')
  if (!userId) {
    await next()
    return
  }

  const key = `${API_RATE_LIMIT_PREFIX}${userId}`
  const count = await redis.incr(key)

  // Set expiry on first request
  if (count === 1) {
    await redis.expire(key, API_RATE_LIMIT_WINDOW)
  }

  if (count > API_RATE_LIMIT_MAX) {
    return c.json({ error: 'Rate limit exceeded. Try again later.' }, 429)
  }

  // Set rate limit headers
  c.res.headers.set('X-RateLimit-Limit', API_RATE_LIMIT_MAX.toString())
  c.res.headers.set('X-RateLimit-Remaining', Math.max(0, API_RATE_LIMIT_MAX - count).toString())

  await next()
}

/**
 * Apply stricter rate limiting to import requests
 */
export async function rateLimitImport(c: Context, next: Next) {
  const userId = c.get('userId')
  if (!userId) {
    await next()
    return
  }

  const key = `${IMPORT_RATE_LIMIT_PREFIX}${userId}`
  const count = await redis.incr(key)

  // Set expiry on first request
  if (count === 1) {
    await redis.expire(key, IMPORT_RATE_LIMIT_WINDOW)
  }

  if (count > IMPORT_RATE_LIMIT_MAX) {
    return c.json({ error: 'Rate limit exceeded. Try again later.' }, 429)
  }

  // Set rate limit headers
  c.res.headers.set('X-RateLimit-Limit', IMPORT_RATE_LIMIT_MAX.toString())
  c.res.headers.set('X-RateLimit-Remaining', Math.max(0, IMPORT_RATE_LIMIT_MAX - count).toString())

  await next()
}
