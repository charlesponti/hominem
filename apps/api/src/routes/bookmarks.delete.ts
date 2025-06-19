import { db } from '@hominem/utils/db'
import { bookmark } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'

const DeleteBookmarkParamsSchema = z.object({
  id: z.string(),
})

export const bookmarksDeleteRoutes = new Hono()

// Delete a bookmark
bookmarksDeleteRoutes.delete(
  '/:id',
  requireAuth,
  zValidator('param', DeleteBookmarkParamsSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const { id } = c.req.valid('param')

    try {
      await db.delete(bookmark).where(and(eq(bookmark.id, id), eq(bookmark.userId, userId)))
      return c.json(null)
    } catch (error) {
      console.error('Error deleting bookmark:', error)
      return c.json({ error: 'Failed to delete bookmark' }, 500)
    }
  }
)
