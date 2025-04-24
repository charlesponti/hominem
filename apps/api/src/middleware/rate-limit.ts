import { redis } from '@hominem/utils/redis'
import type { FastifyReply, FastifyRequest } from 'fastify'

const IMPORT_RATE_LIMIT_PREFIX = 'ratelimit:import:'
const IMPORT_RATE_LIMIT_WINDOW = 60 * 60 // 1 hour
const IMPORT_RATE_LIMIT_MAX = 10 // Max 10 imports per hour

const API_RATE_LIMIT_PREFIX = 'ratelimit:api:'
const API_RATE_LIMIT_WINDOW = 60 // 1 minute
const API_RATE_LIMIT_MAX = 60 // Max 60 requests per minute

/**
 * Apply rate limiting to general API requests
 */
export async function rateLimit(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = request
  if (!userId) return

  const key = `${API_RATE_LIMIT_PREFIX}${userId}`
  const count = await redis.incr(key)

  // Set expiry on first request
  if (count === 1) {
    await redis.expire(key, API_RATE_LIMIT_WINDOW)
  }

  if (count > API_RATE_LIMIT_MAX) {
    reply.code(429)
    throw new Error('Rate limit exceeded. Try again later.')
  }

  // Set rate limit headers
  reply.header('X-RateLimit-Limit', API_RATE_LIMIT_MAX)
  reply.header('X-RateLimit-Remaining', Math.max(0, API_RATE_LIMIT_MAX - count))
}

/**
 * Apply stricter rate limiting to import requests
 */
export async function rateLimitImport(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = request
  if (!userId) return

  const key = `${IMPORT_RATE_LIMIT_PREFIX}${userId}`
  const count = await redis.incr(key)

  // Set expiry on first request
  if (count === 1) {
    await redis.expire(key, IMPORT_RATE_LIMIT_WINDOW)
  }

  if (count > IMPORT_RATE_LIMIT_MAX) {
    reply.code(429)
    throw new Error('Rate limit exceeded. Try again later.')
  }

  // Set rate limit headers
  reply.header('X-RateLimit-Limit', IMPORT_RATE_LIMIT_MAX)
  reply.header('X-RateLimit-Remaining', Math.max(0, IMPORT_RATE_LIMIT_MAX - count))
}