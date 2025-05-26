import type { FastifyInstance } from 'fastify'
import { contentStrategyRoutes } from './content-strategy.router.js'
import { tourRoutes } from './tour.router.js'
import { tweetGenerationRoutes } from './tweet-generation.router.js'

export async function aiRoutes(fastify: FastifyInstance) {
  await fastify.register(contentStrategyRoutes)
  await fastify.register(tourRoutes)
  await fastify.register(tweetGenerationRoutes)
}
