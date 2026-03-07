import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import {
  createTag,
  deleteTag,
  getTag,
  listTags,
  replaceEntityTags,
  tagEntity,
  untagEntity,
  updateTag,
} from '@hominem/db/services/tags.service'
import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  CreateTagInputSchema,
  TaggingInputSchema,
  TagSyncInputSchema,
  UpdateTagInputSchema,
} from '../schemas/tags.schema'
import { ForbiddenError, NotFoundError } from '../errors'

export const tagsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('userId') as Parameters<typeof listTags>[0]
    const tags = await listTags(userId)
    return c.json({ success: true, data: tags })
  })
  .get('/:id', async (c) => {
    const userId = c.get('userId') as Parameters<typeof getTag>[1]
    const id = c.req.param('id') as Parameters<typeof getTag>[0]

    const tag = await getTag(id, userId)
    if (!tag) {
      throw new NotFoundError('Tag not found')
    }
    return c.json({ success: true, data: tag })
  })
  .post('/', zValidator('json', CreateTagInputSchema), async (c) => {
    const userId = c.get('userId') as Parameters<typeof createTag>[0]
    const data = c.req.valid('json')

    const newTag = await createTag(userId, {
      name: data.name,
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.emojiImageUrl !== undefined ? { emojiImageUrl: data.emojiImageUrl } : {}),
    })

    return c.json({ success: true, data: newTag }, 201)
  })
  .patch('/:id', zValidator('json', UpdateTagInputSchema), async (c) => {
    try {
      const userId = c.get('userId') as Parameters<typeof updateTag>[1]
      const id = c.req.param('id') as Parameters<typeof updateTag>[0]
      const data = c.req.valid('json')

      const updateData: Parameters<typeof updateTag>[2] = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.color !== undefined) updateData.color = data.color
      if (data.description !== undefined) updateData.description = data.description
      if (data.emojiImageUrl !== undefined) updateData.emojiImageUrl = data.emojiImageUrl

      const updatedTag = await updateTag(id, userId, updateData)
      if (!updatedTag) {
        throw new NotFoundError('Tag not found or access denied')
      }
      return c.json({ success: true, data: updatedTag })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  .delete('/:id', async (c) => {
    try {
      const userId = c.get('userId') as Parameters<typeof deleteTag>[1]
      const id = c.req.param('id') as Parameters<typeof deleteTag>[0]

      const deleted = await deleteTag(id, userId)
      if (!deleted) {
        throw new NotFoundError('Tag not found or access denied')
      }
      return c.json({ success: true, data: { id } })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  .post('/:id/tag', zValidator('json', TaggingInputSchema), async (c) => {
    const userId = c.get('userId') as Parameters<typeof getTag>[1]
    const tagId = c.req.param('id') as Parameters<typeof getTag>[0]
    const data = c.req.valid('json')

    const tag = await getTag(tagId, userId)
    if (!tag) {
      throw new NotFoundError('Tag not found or access denied')
    }

    const result = await tagEntity(tagId, data.entityId, data.entityType)
    return c.json({ success: true, data: result }, 201)
  })
  .delete('/:id/tag/:entityId', async (c) => {
    const userId = c.get('userId') as Parameters<typeof getTag>[1]
    const tagId = c.req.param('id') as Parameters<typeof getTag>[0]
    const entityId = c.req.param('entityId')
    const entityType = c.req.query('entityType')

    if (!entityType) {
      throw new Error('entityType query parameter required')
    }

    const tag = await getTag(tagId, userId)
    if (!tag) {
      throw new NotFoundError('Tag not found or access denied')
    }

    const result = await untagEntity(tagId, entityId, entityType)
    if (!result) {
      throw new NotFoundError('Tagging not found')
    }

    return c.json({ success: true, data: { id: tagId } })
  })
  .put('/:id/sync', zValidator('json', TagSyncInputSchema), async (c) => {
    const userId = c.get('userId') as Parameters<typeof getTag>[1]
    const tagId = c.req.param('id') as Parameters<typeof getTag>[0]
    const data = c.req.valid('json')

    const tag = await getTag(tagId, userId)
    if (!tag) {
      throw new NotFoundError('Tag not found or access denied')
    }

    await replaceEntityTags(
      userId as Parameters<typeof replaceEntityTags>[0],
      data.entityId,
      data.entityType,
      data.tagIds as Parameters<typeof replaceEntityTags>[3],
    )

    return c.json({ success: true, data: { id: tagId } })
  })
