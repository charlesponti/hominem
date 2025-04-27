import { db } from '@hominem/utils/db'
import { redis } from '@hominem/utils/redis'
import { health } from '@hominem/utils/schema'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { env } from '../lib/env.js'
import { handleError } from '../lib/errors.js'

const healthQuerySchema = z.object({
  userId: z.string().optional(),
  startDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  endDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  activityType: z.string().optional(),
})

const healthDataSchema = z.object({
  userId: z.string(),
  date: z.string().transform((str) => new Date(str)),
  activityType: z.string(),
  duration: z.number(),
  caloriesBurned: z.number(),
  notes: z.string().optional(),
})

const updateHealthDataSchema = z.object({
  date: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  activityType: z.string().optional(),
  duration: z.number().optional(),
  caloriesBurned: z.number().optional(),
  notes: z.string().optional(),
})

export async function healthRoutes(fastify: FastifyInstance) {
  // Get health data with optional filters
  fastify.get('/', async (request, reply) => {
    try {
      const query = healthQuerySchema.parse(request.query)
      const conditions = []

      if (query.userId) {
        conditions.push(eq(health.userId, query.userId))
      }

      if (query.startDate) {
        conditions.push(gte(health.date, query.startDate))
      }

      if (query.endDate) {
        conditions.push(lte(health.date, query.endDate))
      }

      if (query.activityType) {
        conditions.push(eq(health.activityType, query.activityType))
      }

      // If we have conditions, apply them with AND
      if (conditions.length > 0) {
        return db
          .select()
          .from(health)
          .where(and(...conditions))
          .orderBy(desc(health.date))
      }

      // Otherwise return all data
      return db.select().from(health).orderBy(desc(health.date))
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Get health data by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const numericId = Number.parseInt(id, 10)

      if (Number.isNaN(numericId)) {
        return reply.status(400).send({ error: 'Invalid ID format' })
      }

      const result = await db.select().from(health).where(eq(health.id, numericId)).limit(1)

      if (result.length === 0) {
        return reply.status(404).send({ error: 'Health record not found' })
      }

      return result[0]
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Add health data
  fastify.post('/', async (request, reply) => {
    try {
      const validated = healthDataSchema.parse(request.body)

      const result = await db.insert(health).values(validated).returning()
      return result[0]
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Update health data
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const numericId = Number.parseInt(id, 10)

      if (Number.isNaN(numericId)) {
        return reply.status(400).send({ error: 'Invalid ID format' })
      }

      const validated = updateHealthDataSchema.parse(request.body)

      const result = await db
        .update(health)
        .set(validated)
        .where(eq(health.id, numericId))
        .returning()

      if (result.length === 0) {
        return reply.status(404).send({ error: 'Health record not found' })
      }

      return result[0]
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Delete health data
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const numericId = Number.parseInt(id, 10)

      if (Number.isNaN(numericId)) {
        return reply.status(400).send({ error: 'Invalid ID format' })
      }

      const result = await db.delete(health).where(eq(health.id, numericId))
      if (result.count === 0) {
        return reply.status(404).send({ error: 'Health record not found' })
      }

      return { success: true }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}
