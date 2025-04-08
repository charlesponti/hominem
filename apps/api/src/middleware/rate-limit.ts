import { redis } from '@hominem/utils/redis'
import type { FastifyReply, FastifyRequest } from 'fastify'

const RATE_LIMIT_PREFIX = 'ratelimit:import:'
const RATE_LIMIT_WINDOW = 60 * 60 // 1 hour
const RATE_LIMIT_MAX = 10 // Max 10 imports per hour

export async function rateLimitImport(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = request
  if (!userId) return

  const key = `${RATE_LIMIT_PREFIX}${userId}`
  const count = await redis.incr(key)

  // Set expiry on first request
  if (count === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW)
  }

  if (count > RATE_LIMIT_MAX) {
    reply.code(429)
    throw new Error('Rate limit exceeded. Try again later.')
  }

  // Set rate limit headers
  reply.header('X-RateLimit-Limit', RATE_LIMIT_MAX)
  reply.header('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX - count))
}
