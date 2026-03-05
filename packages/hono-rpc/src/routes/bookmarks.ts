import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  CreateBookmarkInputSchema,
  UpdateBookmarkInputSchema,
  ListBookmarksFilterSchema,
} from '../schemas/bookmarks.schema'
import {
  listBookmarks,
  getBookmark,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from '@hominem/db/services/bookmarks.service'
import { NotFoundError, ForbiddenError } from '../errors'

export const bookmarksRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // List bookmarks
  .get('/', zValidator('query', ListBookmarksFilterSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const query = c.req.valid('query')

      const bookmarks = await listBookmarks(userId as any, query.folder)
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

      const bookmark = await getBookmark(id, userId as any)
      if (!bookmark) {
        throw new NotFoundError('Bookmark not found')
      }
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
      const payload: {
        url: string
        title?: string | null
        description?: string | null
        folder?: string | null
      } = {
        url: data.url,
      }
      if (data.title !== undefined) payload.title = data.title
      if (data.description !== undefined) payload.description = data.description
      if (data.folder !== undefined) payload.folder = data.folder

      const newBookmark = await createBookmark(userId as any, payload)

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

      const updateData: {
        url?: string
        title?: string | null
        description?: string | null
        folder?: string | null
      } = {}
      if (data.url !== undefined) updateData.url = data.url
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.folder !== undefined) updateData.folder = data.folder

      const updatedBookmark = await updateBookmark(id, userId as any, updateData)
      if (!updatedBookmark) {
        throw new NotFoundError('Bookmark not found or access denied')
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

      const deleted = await deleteBookmark(id, userId as any)
      if (!deleted) {
        throw new NotFoundError('Bookmark not found or access denied')
      }
      return c.json({ success: true, data: { id } })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
