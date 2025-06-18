import { google } from '@ai-sdk/google'
import { contentTools } from '@hominem/utils/tools'
import { zValidator } from '@hono/zod-validator'
import { generateText } from 'ai'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'

// Zod schema for the request body
const contentStrategyBodySchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  audience: z.string().min(1, 'Audience is required'),
  platforms: z.array(z.string()).min(1, 'At least one platform is required'),
})

export const aiContentStrategyRoutes = new Hono()

// Generate content strategy using AI
aiContentStrategyRoutes.post(
  '/',
  requireAuth,
  zValidator('json', contentStrategyBodySchema),
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
        maxSteps: 5, // Consider making this configurable if needed
      })

      // The original Next.js route expects a specific structure from the tool call.
      // We replicate that logic here.
      const toolCall = result.response.messages.find((message) => message.role === 'tool')

      if (toolCall && Array.isArray(toolCall.content) && toolCall.content.length > 0) {
        // Assuming the structure is { type: 'tool-result', toolCallId: string, toolName: string, result: any }
        // and we want to return the 'result' part.
        const toolResult = toolCall.content[0] as { result: unknown }
        return c.json(toolResult.result ?? {})
      }

      // Handle cases where the expected tool call or result is not found
      console.error(
        'Content strategy generation did not produce the expected tool call output.',
        result
      )
      return c.json({ error: 'Failed to extract content strategy from AI response' }, 500)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid input', details: error.issues }, 400)
      }
      // Log the error for server-side inspection
      console.error('Content Strategy API error:', error)
      return c.json({ error: 'Failed to generate content strategy' }, 500)
    }
  }
)
