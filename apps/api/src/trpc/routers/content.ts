import { ContentService } from '@hominem/utils/services'
import { z } from 'zod'
import { protectedProcedure, router } from '../procedures.js'
import { twitterRouter } from './twitter'

export const contentRouter = router({
  // Get all content for user
  list: protectedProcedure
    .input(
      z.object({
        types: z
          .string()
          .optional()
          .transform(
            (val) =>
              val?.split(',') as
                | (
                    | 'note'
                    | 'task'
                    | 'timer'
                    | 'journal'
                    | 'document'
                    | 'tweet'
                    | 'essay'
                    | 'blog_post'
                    | 'social_post'
                  )[]
                | undefined
          ),
        query: z.string().optional(),
        tags: z
          .string()
          .optional()
          .transform((val) => val?.split(',') as string[] | undefined),
        since: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId
      const contentService = new ContentService()

      try {
        const content = await contentService.list(userId, input)
        return { content }
      } catch (error) {
        console.error('Error fetching content:', error)
        throw new Error(
          `Failed to fetch content: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Create new content
  create: protectedProcedure
    .input(
      z.object({
        type: z
          .enum([
            'note',
            'task',
            'timer',
            'journal',
            'document',
            'tweet',
            'essay',
            'blog_post',
            'social_post',
          ])
          .default('note'),
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
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId
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
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId
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

  // Update content
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid('Invalid content ID format'),
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
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId
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
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId
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

  // Nested routers
  twitter: twitterRouter,
})
