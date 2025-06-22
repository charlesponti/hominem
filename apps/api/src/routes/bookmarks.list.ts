import { db } from '@hominem/utils/db'
import { bookmark } from '@hominem/utils/schema'
import { desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'

export const bookmarksListRoutes = new Hono()

// Get all bookmarks for the authenticated user
bookmarksListRoutes.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  try {
    const bookmarks = await db
      .select()
      .from(bookmark)
      .where(eq(bookmark.userId, userId))
      .orderBy(desc(bookmark.createdAt))

    return c.json(bookmarks)
  } catch (error) {
    console.error('Error fetching bookmarks:', error)
    return c.json({ error: 'Failed to fetch bookmarks' }, 500)
  }
})
