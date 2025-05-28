import { verifyAuth } from '@/middleware/auth'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../../lib/errors'
import { ContentStrategiesService } from '../../services/content-strategies.service'

const generateTweetBodySchema = z.object({
  content: z.string().min(1, 'Content is required'),
  strategyType: z.enum(['default', 'custom']).default('default'),
  strategy: z
    .union([
      z.enum([
        'storytelling',
        'question',
        'statistic',
        'quote',
        'tip',
        'behind-the-scenes',
        'thread-starter',
        'controversy',
        'listicle',
        'education',
      ]),
      z
        .string()
        .uuid(), // For custom strategy IDs
    ])
    .default('storytelling'),
})

const TWEET_CHARACTER_LIMIT = 280

export async function tweetGenerationRoutes(fastify: FastifyInstance) {
  const contentStrategiesService = new ContentStrategiesService()

  fastify.post('/generate-tweet', { preHandler: [verifyAuth] }, async (request, reply) => {
    try {
      const { content, strategyType, strategy } = generateTweetBodySchema.parse(request.body)
      const userId = request.userId // May be undefined for unauthenticated users

      let strategyPrompt = ''
      let strategyName = ''

      if (strategyType === 'custom') {
        // Custom strategies require authentication
        if (!userId) {
          return reply.status(401).send({
            error:
              'Authentication required for custom strategies. Please sign in or use default strategies.',
          })
        }

        // Fetch custom strategy from database
        const customStrategy = await contentStrategiesService.getById(strategy as string, userId)

        if (!customStrategy) {
          return reply.status(404).send({ error: 'Custom content strategy not found' })
        }

        strategyName = customStrategy.title
        strategyPrompt = `
CUSTOM CONTENT STRATEGY: ${customStrategy.title}
Description: ${customStrategy.description || 'No description provided'}

Strategy Details:
- Topic: ${customStrategy.strategy.topic}
- Target Audience: ${customStrategy.strategy.targetAudience}
- Key Insights: ${customStrategy.strategy.keyInsights?.join(', ') || 'None specified'}

Apply this custom strategy when creating the tweet, focusing on the target audience and incorporating the strategic approach outlined above.`
      } else {
        // Use default strategy
        strategyName = strategy as string
        strategyPrompt = getDefaultStrategyPrompt(strategy as string)
      }

      // Create system prompt based on strategy
      const systemPrompt = `You are a social media expert specializing in creating engaging Twitter content.

TASK: Convert the provided content into a compelling tweet using the specified content strategy.

REQUIREMENTS:
- Keep it under ${TWEET_CHARACTER_LIMIT} characters
- Use an engaging and professional tone
- Follow the content strategy guidelines below
- Make it engaging and shareable
- Preserve the core message and key insights
- Use proper Twitter formatting (line breaks, emojis where appropriate)

${strategyPrompt}

Return only the tweet text, nothing else.`

      const result = await generateText({
        model: google('gemini-1.5-pro-latest'),
        system: systemPrompt,
        prompt: `Convert this content into an engaging tweet using the ${strategyName} strategy:\n\n${content}`,
        maxTokens: 100, // Keep it concise
        temperature: 0.7, // Some creativity but controlled
      })

      const tweetText = result.text.trim()

      // Extract hashtags for metadata
      const hashtagRegex = /#(\w+)/g
      const hashtags = [...tweetText.matchAll(hashtagRegex)].map((match) => match[0])

      // Check character count
      const characterCount = tweetText.length

      fastify.log.info(`Generated tweet: ${characterCount} characters`)

      return reply.send({
        text: tweetText,
        hashtags,
        characterCount,
        isOverLimit: characterCount > TWEET_CHARACTER_LIMIT,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Invalid input',
          details: error.issues,
        })
      }

      fastify.log.error('Tweet generation error:', error)
      return handleError(error as Error, reply)
    }
  })

  // Helper function to get default strategy prompts
  function getDefaultStrategyPrompt(strategy: string): string {
    const defaultStrategies: Record<string, string> = {
      storytelling:
        'CONTENT STRATEGY: Storytelling - Create a narrative arc with beginning, middle, and end',
      question:
        'CONTENT STRATEGY: Question - Start with a thought-provoking question to drive engagement',
      statistic: 'CONTENT STRATEGY: Statistic - Lead with a compelling statistic or data point',
      quote: 'CONTENT STRATEGY: Quote - Transform key insights into quotable, shareable statements',
      tip: 'CONTENT STRATEGY: Tip - Present actionable advice or quick wins',
      'behind-the-scenes':
        'CONTENT STRATEGY: Behind-the-scenes - Share process, journey, or insider perspective',
      'thread-starter':
        'CONTENT STRATEGY: Thread-starter - Create intrigue to encourage thread continuation',
      controversy:
        'CONTENT STRATEGY: Controversy - Present a contrarian or debate-worthy perspective (respectfully)',
      listicle:
        'CONTENT STRATEGY: Listicle - Break down content into numbered points or quick list',
      education: 'CONTENT STRATEGY: Education - Focus on teaching a concept or sharing knowledge',
    }

    return defaultStrategies[strategy] || defaultStrategies.storytelling
  }
}
