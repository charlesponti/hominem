import { ContentService } from '@hominem/utils/services'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { ForbiddenError } from '../../lib/errors.js'
import { requireAuth } from '../../middleware/auth.js'

export const contentRoutes = new Hono()

const contentService = new ContentService()

// Content creation schema (publishable content only)
const createContentSchema = z.object({
  type: z.enum(['tweet', 'essay', 'blog_post', 'social_post']).default('tweet'),
  title: z.string().optional(),
  content: z.string(),
  tags: z
    .array(z.object({ value: z.string() }))
    .optional()
    .default([]),
  mentions: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional()
    .default([]),
  taskMetadata: z
    .object({
      status: z.enum(['todo', 'in-progress', 'done', 'archived']).default('todo'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').optional(),
      dueDate: z.string().nullable().optional(),
      startTime: z.string().optional(),
      firstStartTime: z.string().optional(),
      endTime: z.string().optional(),
      duration: z.number().optional(),
    })
    .optional(),
  tweetMetadata: z
    .object({
      tweetId: z.string().optional(),
      url: z.string().optional(),
      status: z.enum(['draft', 'posted', 'failed']).default('draft'),
      postedAt: z.string().optional(),
      importedAt: z.string().optional(),
      metrics: z
        .object({
          retweets: z.number().optional(),
          likes: z.number().optional(),
          replies: z.number().optional(),
          views: z.number().optional(),
        })
        .optional(),
      threadPosition: z.number().optional(),
      threadId: z.string().optional(),
      inReplyTo: z.string().optional(),
    })
    .optional(),
})

// Content update schema
const updateContentSchema = z.object({
  type: z.enum(['note', 'task', 'timer', 'journal', 'document', 'tweet']).optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.object({ value: z.string() })).optional(),
  mentions: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  taskMetadata: z
    .object({
      status: z.enum(['todo', 'in-progress', 'done', 'archived']).default('todo'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').optional(),
      dueDate: z.string().nullable().optional(),
      startTime: z.string().optional(),
      firstStartTime: z.string().optional(),
      endTime: z.string().optional(),
      duration: z.number().optional(),
    })
    .optional(),
  tweetMetadata: z
    .object({
      tweetId: z.string().optional(),
      url: z.string().optional(),
      status: z.enum(['draft', 'posted', 'failed']).default('draft'),
      postedAt: z.string().optional(),
      importedAt: z.string().optional(),
      metrics: z
        .object({
          retweets: z.number().optional(),
          likes: z.number().optional(),
          replies: z.number().optional(),
          views: z.number().optional(),
        })
        .optional(),
      threadPosition: z.number().optional(),
      threadId: z.string().optional(),
      inReplyTo: z.string().optional(),
    })
    .optional(),
})

// Content list query schema
const listContentSchema = z.object({
  types: z
    .string()
    .optional()
    .transform(
      (val) =>
        val?.split(',') as
          | ('note' | 'task' | 'timer' | 'journal' | 'document' | 'tweet')[]
          | undefined
    ),
  query: z.string().optional(),
  tags: z
    .string()
    .optional()
    .transform((val) => val?.split(',') as string[] | undefined),
  since: z.string().optional(),
})

// Content ID param schema
const contentIdSchema = z.object({
  id: z.string().uuid('Invalid content ID format'),
})

// Get all content for user
contentRoutes.get('/', requireAuth, zValidator('query', listContentSchema), async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const filters = c.req.valid('query')
    const content = await contentService.list(userId, filters)
    return c.json({ content })
  } catch (error) {
    console.error('Error fetching content:', error)
    return c.json(
      {
        error: 'Failed to fetch content',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Create new content
contentRoutes.post('/', requireAuth, zValidator('json', createContentSchema), async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const contentData = c.req.valid('json')
    const newContent = await contentService.create({
      ...contentData,
      userId,
    })
    return c.json({ content: newContent }, 201)
  } catch (error) {
    console.error('Error creating content:', error)
    return c.json(
      {
        error: 'Failed to create content',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Get content by ID
contentRoutes.get('/:id', requireAuth, zValidator('param', contentIdSchema), async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const { id } = c.req.valid('param')
    const content = await contentService.getById(id, userId)
    return c.json({ content })
  } catch (error) {
    if (error instanceof Error && error.message === 'Content not found') {
      return c.json({ error: 'Content not found' }, 404)
    }
    console.error('Error fetching content:', error)
    return c.json(
      {
        error: 'Failed to fetch content',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Update content
contentRoutes.put(
  '/:id',
  requireAuth,
  zValidator('param', contentIdSchema),
  zValidator('json', updateContentSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      throw ForbiddenError('Unauthorized')
    }

    try {
      const { id } = c.req.valid('param')
      const updateData = c.req.valid('json')

      const updatedContent = await contentService.update({
        id,
        userId,
        ...updateData,
      })
      return c.json({ content: updatedContent })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Content not found or not authorized to update'
      ) {
        return c.json({ error: 'Content not found' }, 404)
      }
      console.error('Error updating content:', error)
      return c.json(
        {
          error: 'Failed to update content',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Delete content
contentRoutes.delete('/:id', requireAuth, zValidator('param', contentIdSchema), async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const { id } = c.req.valid('param')
    await contentService.delete(id, userId)
    return c.json({ success: true, message: 'Content deleted successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Content not found') {
      return c.json({ error: 'Content not found' }, 404)
    }
    console.error('Error deleting content:', error)
    return c.json(
      {
        error: 'Failed to delete content',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
