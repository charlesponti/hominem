import { db } from '@ponti/utils/db'
import { notes } from '@ponti/utils/schema'
import { and, desc, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'

const ideaSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    description: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
}
const ideasPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get(
    '/ideas',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: ideaSchema,
          },
        },
      },
    },
    async (request: FastifyRequest) => {
      const { userId } = request
      const ideas = await db
        .select()
        .from(notes)
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.createdAt))
      return ideas
    }
  )

  server.post(
    '/ideas',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            description: { type: 'string' },
          },
          required: ['description'],
        },
        response: {
          200: ideaSchema,
        },
      },
    },
    async (request: FastifyRequest) => {
      const { content, description, title } = request.body as {
        content: string
        description: string
        title: string
      }
      const { userId } = request
      const newIdea = await db.insert(notes).values({
        id: crypto.randomUUID(),
        content,
        title: title || content.slice(0, 50),
        userId,
      })
      return newIdea
    }
  )

  server.delete(
    '/ideas/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: ideaSchema,
        },
      },
    },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string }
      const { userId } = request
      await db.delete(notes).where(and(eq(notes.userId, userId), eq(notes.id, id)))
      return true
    }
  )
}

export default ideasPlugin
