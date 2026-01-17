import { google } from '@ai-sdk/google'
import { ContentStrategySchema } from '@hominem/db/schema'
import { ContentStrategiesService } from '@hominem/services/services'
import { content_generator } from '@hominem/services/tools'
import { generateText } from 'ai'
import { z } from 'zod'
import { protectedProcedure, router } from '../procedures'

export const contentStrategiesRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
        strategy: ContentStrategySchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId
      const contentStrategiesService = new ContentStrategiesService()

      try {
        const result = await contentStrategiesService.create({
          ...input,
          userId,
        })
        return result
      } catch (error) {
        console.error('Create content strategy error:', error)
        throw new Error(
          `Failed to create content strategy: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId
    const contentStrategiesService = new ContentStrategiesService()

    try {
      const strategies = await contentStrategiesService.getByUserId(userId)
      return strategies
    } catch (error) {
      console.error('Get content strategies error:', error)
      throw new Error(
        `Failed to get content strategies: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid('Invalid content strategy ID format') }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId
      const contentStrategiesService = new ContentStrategiesService()

      try {
        const strategy = await contentStrategiesService.getById(input.id, userId)

        if (!strategy) {
          throw new Error('Content strategy not found')
        }

        return strategy
      } catch (error) {
        console.error('Get content strategy error:', error)
        throw new Error(
          `Failed to get content strategy: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid('Invalid content strategy ID format'),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        strategy: ContentStrategySchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId
      const contentStrategiesService = new ContentStrategiesService()

      try {
        const { id, ...validatedData } = input
        const result = await contentStrategiesService.update(id, userId, validatedData)

        if (!result) {
          throw new Error('Content strategy not found')
        }

        return result
      } catch (error) {
        console.error('Update content strategy error:', error)
        throw new Error(
          `Failed to update content strategy: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid('Invalid content strategy ID format') }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId
      const contentStrategiesService = new ContentStrategiesService()

      try {
        const deleted = await contentStrategiesService.delete(input.id, userId)

        if (!deleted) {
          throw new Error('Content strategy not found')
        }

        return { success: true }
      } catch (error) {
        console.error('Delete content strategy error:', error)
        throw new Error(
          `Failed to delete content strategy: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  generate: protectedProcedure
    .input(
      z.object({
        topic: z.string().min(1, 'Topic is required'),
        audience: z.string().min(1, 'Audience is required'),
        platforms: z.array(z.string()).min(1, 'At least one platform is required'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { topic, audience, platforms } = input

        const result = await generateText({
          model: google('gemini-1.5-pro-latest'),
          tools: {
            content_generator,
          },
          system:
            'You are a professional content strategist who helps create comprehensive content plans tailored to specific topics and audiences.',
          messages: [
            {
              role: 'user',
              content: `Create a comprehensive content strategy for the topic "${topic}" targeting the audience "${audience}". Include the following elements:
        
1. Key insights about the topic and audience.
2. A detailed content plan including:
    - Blog post ideas with titles, outlines, word counts, SEO keywords, and CTAs.
    - Social media content ideas for platforms like ${platforms.join(', ')}.
    - Visual content ideas such as infographics and image search terms.
3. Monetization ideas and competitive analysis.
        
Ensure all content ideas are tailored to both the topic and audience.`,
            },
          ],
          maxSteps: 5,
        })

        const toolCall = result.response.messages.find((message) => message.role === 'tool')

        if (toolCall && Array.isArray(toolCall.content) && toolCall.content.length > 0) {
          const toolResult = toolCall.content[0] as { result: unknown }
          return toolResult.result ?? {}
        }

        console.error(
          'Content strategy generation did not produce the expected tool call output.',
          result
        )
        throw new Error('Failed to extract content strategy from AI response')
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid input: ${error.issues.map((i) => i.message).join(', ')}`)
        }
        console.error('Content Strategy API error:', error)
        throw new Error('Failed to generate content strategy')
      }
    }),
})
