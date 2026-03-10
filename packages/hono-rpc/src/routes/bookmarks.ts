import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  CreateBookmarkInputSchema,
  UpdateBookmarkInputSchema,
  ListBookmarksFilterSchema,
} from '../schemas/bookmarks.schema'
import { db, ForbiddenError, NotFoundError } from '@hominem/db'

async function getBookmarkWithOwnershipCheck(id: string, userId: string) {
  const bookmark = await db
    .selectFrom('bookmarks')
    .selectAll()
    .where('id', '=', id)
    .where('user_id', '=', userId)
    .executeTakeFirst()

  if (!bookmark) {
    throw new ForbiddenError('Bookmark not found or access denied')
  }
  return bookmark
}

export const bookmarksRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // List bookmarks
  .get('/', zValidator('query', ListBookmarksFilterSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const query = c.req.valid('query')

      let dbQuery = db.selectFrom('bookmarks').selectAll().where('user_id', '=', userId)

      if (query.folder) {
        dbQuery = dbQuery.where('folder', '=', query.folder)
      }

      const bookmarks = await dbQuery.orderBy('created_at', 'desc').execute()
      return c.json({ success: true, data: bookmarks })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  // Get single bookmark
  .get('/:id', async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')

      const bookmark = await getBookmarkWithOwnershipCheck(id, userId)
      return c.json({ success: true, data: bookmark })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  // Create bookmark
  .post('/', zValidator('json', CreateBookmarkInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const data = c.req.valid('json')

      const newBookmark = await db
        .insertInto('bookmarks')
        .values({
          user_id: userId,
          url: data.url,
          title: data.title ?? null,
          description: data.description ?? null,
          folder: data.folder ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      return c.json({ success: true, data: newBookmark }, 201)
    } catch (error) {
      throw error
    }
  })
  // Update bookmark
  .patch('/:id', zValidator('json', UpdateBookmarkInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')
      const data = c.req.valid('json')

      // Verify ownership first
      await getBookmarkWithOwnershipCheck(id, userId)

      const updateData: {
        url?: string
        title?: string | null
        description?: string | null
        folder?: string | null
      } = {}
      if (data.url !== undefined) updateData.url = data.url
      if (data.title !== undefined) updateData.title = data.title ?? null
      if (data.description !== undefined) updateData.description = data.description ?? null
      if (data.folder !== undefined) updateData.folder = data.folder ?? null

      const updatedBookmark = await db
        .updateTable('bookmarks')
        .set(updateData)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()

      if (!updatedBookmark) {
        throw new NotFoundError('Bookmark not found')
      }
      return c.json({ success: true, data: updatedBookmark })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  // Delete bookmark
  .delete('/:id', async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')

      // Verify ownership first
      await getBookmarkWithOwnershipCheck(id, userId)

      const result = await db
        .deleteFrom('bookmarks')
        .where('id', '=', id)
        .executeTakeFirst()

      if ((result.numDeletedRows ?? 0n) === 0n) {
        throw new NotFoundError('Bookmark not found')
      }
      return c.json({ success: true, data: { id } })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
