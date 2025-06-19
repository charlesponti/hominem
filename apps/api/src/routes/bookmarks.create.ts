import { db } from '@hominem/utils/db'
import { bookmark } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import crypto from 'node:crypto'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { convertOGContentToBookmark, getOpenGraphData } from './bookmarks/bookmarks.utils.js'

const CreateBookmarkSchema = z.object({
  url: z.string().url(),
})

export const bookmarksCreateRoutes = new Hono()

// Create a new bookmark
bookmarksCreateRoutes.post(
  '/',
  requireAuth,
  zValidator('json', CreateBookmarkSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const { url } = c.req.valid('json')

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
      return c.json({ bookmark: obj })
    } catch (error) {
      console.error('Error creating bookmark:', error)
      return c.json({ message: 'Bookmark could not be created' }, 500)
    }
  }
)
