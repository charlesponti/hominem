import { db } from '@hominem/utils/db'
import { contentStrategies } from '@hominem/utils/schema'
import { TRPCError } from '@trpc/server'
import { and, asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { protectedProcedure, router } from '../index'

// Input schemas
const createContentStrategySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  strategy: z.object({
    topic: z.string(),
    targetAudience: z.string(),
    platforms: z.array(z.string()).optional(),
    keyInsights: z.array(z.string()).optional(),
    contentPlan: z
      .object({
        blog: z
          .object({
            title: z.string(),
            outline: z.array(
              z.object({
                heading: z.string(),
                content: z.string(),
              })
            ),
            wordCount: z.number(),
            seoKeywords: z.array(z.string()),
            callToAction: z.string(),
          })
          .optional(),
        socialMedia: z
          .array(
            z.object({
              platform: z.string(),
              contentIdeas: z.array(z.string()),
              hashtagSuggestions: z.array(z.string()),
              bestTimeToPost: z.string(),
            })
          )
          .optional(),
        visualContent: z
          .object({
            infographicIdeas: z.array(z.string()),
            imageSearchTerms: z.array(z.string()),
          })
          .optional(),
      })
      .optional(),
    monetization: z.array(z.string()).optional(),
    competitiveAnalysis: z
      .object({
        gaps: z.string(),
        opportunities: z.array(z.string()),
      })
      .optional(),
  }),
})

const updateContentStrategySchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  strategy: z.object({
    topic: z.string(),
    targetAudience: z.string(),
    platforms: z.array(z.string()).optional(),
    keyInsights: z.array(z.string()).optional(),
    contentPlan: z
      .object({
        blog: z
          .object({
            title: z.string(),
            outline: z.array(
              z.object({
                heading: z.string(),
                content: z.string(),
              })
            ),
            wordCount: z.number(),
            seoKeywords: z.array(z.string()),
            callToAction: z.string(),
          })
          .optional(),
        socialMedia: z
          .array(
            z.object({
              platform: z.string(),
              contentIdeas: z.array(z.string()),
              hashtagSuggestions: z.array(z.string()),
              bestTimeToPost: z.string(),
            })
          )
          .optional(),
        visualContent: z
          .object({
            infographicIdeas: z.array(z.string()),
            imageSearchTerms: z.array(z.string()),
          })
          .optional(),
      })
      .optional(),
    monetization: z.array(z.string()).optional(),
    competitiveAnalysis: z
      .object({
        gaps: z.string(),
        opportunities: z.array(z.string()),
      })
      .optional(),
  }).optional(),
})

export const contentStrategiesRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const strategies = await db
        .select()
        .from(contentStrategies)
        .where(eq(contentStrategies.userId, ctx.userId))
        .orderBy(desc(contentStrategies.createdAt))

      return strategies
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [strategy] = await db
        .select()
        .from(contentStrategies)
        .where(and(eq(contentStrategies.id, input.id), eq(contentStrategies.userId, ctx.userId)))
      
      if (!strategy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Content strategy not found',
        })
      }
      
      return strategy
    }),

  create: protectedProcedure
    .input(createContentStrategySchema)
    .mutation(async ({ input, ctx }) => {
      const [strategy] = await db
        .insert(contentStrategies)
        .values({
          ...input,
          userId: ctx.userId,
        })
        .returning()
      
      return strategy
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: updateContentStrategySchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input
      
      const [strategy] = await db
        .update(contentStrategies)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(contentStrategies.id, id), eq(contentStrategies.userId, ctx.userId)))
        .returning()
      
      if (!strategy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Content strategy not found',
        })
      }
      
      return strategy
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [strategy] = await db
        .delete(contentStrategies)
        .where(and(eq(contentStrategies.id, input.id), eq(contentStrategies.userId, ctx.userId)))
        .returning()
      
      if (!strategy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Content strategy not found',
        })
      }
      
      return { success: true, message: 'Content strategy deleted successfully' }
    }),
}) 
