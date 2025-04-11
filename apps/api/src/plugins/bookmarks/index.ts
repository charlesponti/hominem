import { db } from '@hominem/utils/db'
import { bookmark } from '@hominem/utils/schema'
import { and, desc, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import { convertOGContentToBookmark, getOpenGraphData } from './utils'

type LinkType = {
  image: string
  title: string
  description: string
  url: string
  siteName: string
  imageWidth: string
  imageHeight: string
  type: string
  createdAt: string
  updatedAt: string
}

export type SpotifyLink = LinkType & {
  type: 'spotify'
  spotifyId: string
}

export type AirbnbLink = LinkType & {
  type: 'airbnb'
  airbnbId: string
}

const bookmarkSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    image: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    url: { type: 'string' },
    siteName: { type: 'string' },
    imageWidth: { type: 'string' },
    imageHeight: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
}

const bookmarksPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get(
    '/bookmarks',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: bookmarkSchema,
          },
        },
      },
    },
    async (request: FastifyRequest, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' })
      }

      const bookmarks = await db
        .select()
        .from(bookmark)
        .where(eq(bookmark.userId, userId))
        .orderBy(desc(bookmark.createdAt))

      return bookmarks
    }
  )

  server.post(
    '/bookmarks',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        response: {
          200: bookmarkSchema,
        },
      },
    },
    async (request: FastifyRequest, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' })
      }

      const { url } = request.body as { url: string }

      try {
        const ogContent = await getOpenGraphData({ url })
        const converted = convertOGContentToBookmark({
          url,
          ogContent,
        })

        const obj = await db.insert(bookmark).values({
          ...converted,
          id: crypto.randomUUID(),
          userId,
        })
        return { bookmark: obj }
      } catch (err) {
        console.error('Error creating bookmark:', err)
        return reply.code(500).send({ message: 'Bookmark could not be created' })
      }
    }
  )

  server.put(
    '/bookmarks/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        response: {
          200: bookmarkSchema,
        },
      },
    },
    async (request: FastifyRequest, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' })
      }

      const { id } = request.params as { id: string }
      const { url } = request.body as { url: string }
      try {
        const ogContent = await getOpenGraphData({ url })
        const converted = convertOGContentToBookmark({
          url,
          ogContent,
        })

        const obj = await db
          .update(bookmark)
          .set(converted)
          .where(and(eq(bookmark.id, id), eq(bookmark.userId, userId)))
        return { bookmark: obj }
      } catch (err) {
        return reply.code(500).send({ message: 'Bookmark could not be updated' })
      }
    }
  )

  server.delete(
    '/bookmarks/:id',
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
          200: bookmarkSchema,
        },
      },
    },
    async (request: FastifyRequest, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' })
      }

      const { id } = request.params as { id: string }

      await db.delete(bookmark).where(and(eq(bookmark.id, id), eq(bookmark.userId, userId)))

      reply.code(200).send(null)
    }
  )
}

export default bookmarksPlugin
