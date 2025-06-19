import type { Context, Next } from 'hono'

interface RateLimitOptions {
  maxHits: number
  segment: string
  windowLength: number
}

// Simple in-memory rate limiting (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export const rateLimitMiddleware = (options: RateLimitOptions) => {
  return async (c: Context, next: Next) => {
    const { maxHits, windowLength } = options
    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const key = `${options.segment}:${clientIp}`
    const now = Date.now()

    const record = rateLimitStore.get(key)

    if (!record || now > record.resetTime) {
      // Reset or create new record
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowLength,
      })
    } else {
      // Increment existing record
      record.count++

      if (record.count > maxHits) {
        return c.json({ error: 'Too many requests' }, 429)
      }
    }

    await next()
  }
}

// Default export for backward compatibility
export default rateLimitMiddleware
