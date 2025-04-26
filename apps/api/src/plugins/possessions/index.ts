import { db, takeUniqueOrThrow } from '@hominem/utils/db'
import { possessions } from '@hominem/utils/schema'
import { desc, eq } from 'drizzle-orm'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import crypto from 'node:crypto'
import { z } from 'zod'
import { ForbiddenError } from '../../lib/errors.js'
import { verifyAuth } from '../../middleware/auth'

const createPossessionSchema = {
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    dateAcquired: z.string(),
    purchasePrice: z.number(),
    categoryId: z.string(),
  }),
}

const updatePossessionSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    dateAcquired: z.string().optional(),
    purchasePrice: z.number().optional(),
    categoryId: z.string().optional(),
  }),
}

const deletePossessionSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
}

const possessionsPlugin: FastifyPluginAsync = async (server) => {
  server.get('/possessions', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const { userId } = request
    if (!userId) throw ForbiddenError('Unauthorized')
    const items = await db
      .select()
      .from(possessions)
      .where(eq(possessions.userId, userId))
      .orderBy(desc(possessions.createdAt))
    return items
  })

  server.post('/possessions', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const { userId } = request
    if (!userId) throw ForbiddenError('Unauthorized')
    const parsed = createPossessionSchema.body.safeParse(request.body)
    if (!parsed.success) throw new Error(parsed.error.message)
    const data = parsed.data
    const created = await db
      .insert(possessions)
      .values({
        ...data,
        id: crypto.randomUUID ? crypto.randomUUID() : 'generated-id',
        userId,
        dateAcquired: new Date(data.dateAcquired),
      })
      .returning()
      .then(takeUniqueOrThrow)
    return created
  })

  server.put('/possessions/:id', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const paramsResult = updatePossessionSchema.params.safeParse(request.params)
    if (!paramsResult.success) throw new Error(paramsResult.error.message)
    const { id } = paramsResult.data
    const bodyResult = updatePossessionSchema.body.safeParse(request.body)
    if (!bodyResult.success) throw new Error(bodyResult.error.message)
    const data = bodyResult.data
    const updated = await db
      .update(possessions)
      .set({
        ...data,
        dateAcquired: data.dateAcquired ? new Date(data.dateAcquired) : undefined,
      })
      .where(eq(possessions.id, id))
      .returning()
    return updated
  })

  server.delete(
    '/possessions/:id',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply) => {
      const result = deletePossessionSchema.params.safeParse(request.params)
      if (!result.success) throw new Error(result.error.message)
      const { id } = result.data
      await db.delete(possessions).where(eq(possessions.id, id))
      return reply.status(204).send()
    }
  )
}

export default possessionsPlugin
