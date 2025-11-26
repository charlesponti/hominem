import { PublishingContentTypeSchema } from '@hominem/data/schema'
import { ContentService } from '@hominem/utils/services'
import { z } from 'zod'
import { protectedProcedure, router } from '../procedures'

export const contentRouter = router({
  // Get all content for user (only publishable content types)
  list: protectedProcedure
    .input(
      z.object({
        types: z
          .string()
          .optional()
          .transform(
            (val) =>
              val?.split(',') as ('tweet' | 'essay' | 'blog_post' | 'social_post')[] | undefined
          ),
        query: z.string().optional(),
        tags: z
          .string()
          .optional()
          .transform((val) => val?.split(',') as string[] | undefined),
        since: z.string().optional(),
      })
    )
    .query(async (opts) => {
      const { input, ctx } = opts
      const userId = ctx.userId
      if (!userId) {
        throw new Error('User ID is required')
      }

      const contentService = new ContentService()

      try {
        const content = await contentService.list(userId, {
          types: input.types,
          query: input.query,
          tags: input.tags,
          since: input.since,
        })
        return { content }
      } catch (error) {
        console.error('Error fetching content:', error)
        throw new Error(
          `Failed to fetch content: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Create new content (only publishable content types)
  create: protectedProcedure
    .input(
      z.object({
        type: PublishingContentTypeSchema.default('tweet'),
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
    )
    .mutation(async (opts) => {
      const { input, ctx } = opts
      const userId = ctx.userId
      if (!userId) {
        throw new Error('User ID is required')
      }

      const contentService = new ContentService()

      try {
        const newContent = await contentService.create({
          ...input,
          userId,
        })
        return { content: newContent }
      } catch (error) {
        console.error('Error creating content:', error)
        throw new Error(
          `Failed to create content: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Get content by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid('Invalid content ID format') }))
    .query(async (opts) => {
      const { input, ctx } = opts
      const userId = ctx.userId
      if (!userId) {
        throw new Error('User ID is required')
      }

      const contentService = new ContentService()

      try {
        const content = await contentService.getById(input.id, userId)
        return { content }
      } catch (error) {
        if (error instanceof Error && error.message === 'Content not found') {
          throw new Error('Content not found')
        }
        console.error('Error fetching content:', error)
        throw new Error(
          `Failed to fetch content: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Update content (only publishable content types)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid('Invalid content ID format'),
        type: PublishingContentTypeSchema.optional(),
        title: z.string().optional(),
        content: z.string().optional(),
        tags: z.array(z.object({ value: z.string() })).optional(),
        mentions: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
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
    )
    .mutation(async (opts) => {
      const { input, ctx } = opts
      const userId = ctx.userId
      if (!userId) {
        throw new Error('User ID is required')
      }

      const contentService = new ContentService()

      try {
        const { id, ...updateData } = input
        const updatedContent = await contentService.update({
          id,
          userId,
          ...updateData,
        })
        return { content: updatedContent }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'Content not found or not authorized to update'
        ) {
          throw new Error('Content not found')
        }
        console.error('Error updating content:', error)
        throw new Error(
          `Failed to update content: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Delete content
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid('Invalid content ID format') }))
    .mutation(async (opts) => {
      const { input, ctx } = opts
      const userId = ctx.userId
      if (!userId) {
        throw new Error('User ID is required')
      }

      const contentService = new ContentService()

      try {
        await contentService.delete(input.id, userId)
        return { success: true, message: 'Content deleted successfully' }
      } catch (error) {
        if (error instanceof Error && error.message === 'Content not found') {
          throw new Error('Content not found')
        }
        console.error('Error deleting content:', error)
        throw new Error(
          `Failed to delete content: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),
})
