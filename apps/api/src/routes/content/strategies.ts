import { google } from '@ai-sdk/google'
import { ContentStrategySchema } from '@hominem/utils/schemas'
import { contentTools } from '@hominem/utils/tools'
import { zValidator } from '@hono/zod-validator'
import { generateText } from 'ai'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.js'
import { ContentStrategiesService } from '../../services/content-strategies.service.js'

export const contentStrategiesRoutes = new Hono()

const createContentStrategySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  strategy: ContentStrategySchema,
})

const updateContentStrategySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  strategy: ContentStrategySchema.optional(),
})

const contentStrategyIdSchema = z.object({
  id: z.string().uuid('Invalid content strategy ID format'),
})

const contentStrategiesService = new ContentStrategiesService()

// Create new content strategy
contentStrategiesRoutes.post(
  '/',
  requireAuth,
  zValidator('json', createContentStrategySchema),
  async (c) => {
    try {
      const userId = c.get('userId')
      if (!userId) {
        console.error('Create content strategy failed: Missing user ID')
        return c.json({ error: 'User ID is required' }, 401)
      }

      const validatedData = c.req.valid('json')

      const result = await contentStrategiesService.create({
        ...validatedData,
        userId,
      })

      return c.json(result, 201)
    } catch (error) {
      console.error('Create content strategy error:', error)
      return c.json(
        {
          error: 'Failed to create content strategy',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Get all content strategies for user
contentStrategiesRoutes.get('/', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 401)
    }

    const strategies = await contentStrategiesService.getByUserId(userId)
    return c.json(strategies)
  } catch (error) {
    console.error('Get content strategies error:', error)
    return c.json(
      {
        error: 'Failed to get content strategies',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Get specific content strategy by ID
contentStrategiesRoutes.get(
  '/:id',
  requireAuth,
  zValidator('param', contentStrategyIdSchema),
  async (c) => {
    try {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ error: 'User ID is required' }, 401)
      }

      const { id } = c.req.valid('param')
      const strategy = await contentStrategiesService.getById(id, userId)

      if (!strategy) {
        return c.json({ error: 'Content strategy not found' }, 404)
      }

      return c.json(strategy)
    } catch (error) {
      console.error('Get content strategy error:', error)
      return c.json(
        {
          error: 'Failed to get content strategy',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Update content strategy
contentStrategiesRoutes.put(
  '/:id',
  requireAuth,
  zValidator('param', contentStrategyIdSchema),
  zValidator('json', updateContentStrategySchema),
  async (c) => {
    try {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ error: 'User ID is required' }, 401)
      }

      const { id } = c.req.valid('param')
      const validatedData = c.req.valid('json')

      const result = await contentStrategiesService.update(id, userId, validatedData)

      if (!result) {
        return c.json({ error: 'Content strategy not found' }, 404)
      }

      return c.json(result)
    } catch (error) {
      console.error('Update content strategy error:', error)
      return c.json(
        {
          error: 'Failed to update content strategy',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Delete content strategy
contentStrategiesRoutes.delete(
  '/:id',
  requireAuth,
  zValidator('param', contentStrategyIdSchema),
  async (c) => {
    try {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ error: 'User ID is required' }, 401)
      }

      const { id } = c.req.valid('param')
      const deleted = await contentStrategiesService.delete(id, userId)

      if (!deleted) {
        return c.json({ error: 'Content strategy not found' }, 404)
      }

      return c.body(null, 204)
    } catch (error) {
      console.error('Delete content strategy error:', error)
      return c.json(
        {
          error: 'Failed to delete content strategy',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// AI generation schema (moved from ai.content-strategy.ts)
const generateStrategySchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  audience: z.string().min(1, 'Audience is required'),
  platforms: z.array(z.string()).min(1, 'At least one platform is required'),
})

// Generate content strategy using AI
contentStrategiesRoutes.post(
  '/generate',
  requireAuth,
  zValidator('json', generateStrategySchema),
  async (c) => {
    try {
      const { topic, audience, platforms } = c.req.valid('json')

      const result = await generateText({
        model: google('gemini-1.5-pro-latest'),
        tools: {
          content_generator: contentTools.content_generator,
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

      // Extract tool call result
      const toolCall = result.response.messages.find((message) => message.role === 'tool')

      if (toolCall && Array.isArray(toolCall.content) && toolCall.content.length > 0) {
        const toolResult = toolCall.content[0] as { result: unknown }
        return c.json(toolResult.result ?? {})
      }

      console.error(
        'Content strategy generation did not produce the expected tool call output.',
        result
      )
      return c.json({ error: 'Failed to extract content strategy from AI response' }, 500)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid input', details: error.issues }, 400)
      }
      console.error('Content Strategy API error:', error)
      return c.json({ error: 'Failed to generate content strategy' }, 500)
    }
  }
)
