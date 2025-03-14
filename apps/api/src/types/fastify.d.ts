import type { Redis } from 'ioredis'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
  
  interface FastifyRequest {
    userId: string | null
  }
}