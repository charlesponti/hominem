import { db } from '@hominem/utils/db'
import { bookmark } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { convertOGContentToBookmark, getOpenGraphData } from './bookmarks/bookmarks.utils.js'

const UpdateBookmarkParamsSchema = z.object({
  id: z.string(),
})

const UpdateBookmarkBodySchema = z.object({
  url: z.string().url(),
})

export const bookmarksUpdateRoutes = new Hono()

// Update a bookmark
bookmarksUpdateRoutes.put(
  '/:id',
  requireAuth,
  zValidator('param', UpdateBookmarkParamsSchema),
  zValidator('json', UpdateBookmarkBodySchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const { id } = c.req.valid('param')
    const { url } = c.req.valid('json')

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

      return c.json({ bookmark: obj })
    } catch (error) {
      console.error('Error updating bookmark:', error)
      return c.json({ message: 'Bookmark could not be updated' }, 500)
    }
  }
)
