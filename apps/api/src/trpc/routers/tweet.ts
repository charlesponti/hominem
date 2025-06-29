import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { z } from 'zod'
import { ContentStrategiesService } from '../../services/content-strategies.service.js'
import { protectedProcedure, router } from '../index'

export const tweetRouter = router({
  // Generate tweet from content using AI
  generate: protectedProcedure
    .input(
      z.object({
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
            z.string().uuid(), // For custom strategy IDs
          ])
          .default('storytelling'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { content, strategyType, strategy } = input
        const userId = ctx.userId
        const contentStrategiesService = new ContentStrategiesService()

        const TWEET_CHARACTER_LIMIT = 280

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
            listicle: 'CONTENT STRATEGY: Listicle - Break down content into numbered points or quick list',
            education: 'CONTENT STRATEGY: Education - Focus on teaching a concept or sharing knowledge',
          }

          return defaultStrategies[strategy] || defaultStrategies.storytelling
        }

        let strategyPrompt = ''
        let strategyName = ''

        if (strategyType === 'custom') {
          // Custom strategies require authentication
          if (!userId) {
            throw new Error(
              'Authentication required for custom strategies. Please sign in or use default strategies.'
            )
          }

          // Fetch custom strategy from database
          const customStrategy = await contentStrategiesService.getById(strategy as string, userId)

          if (!customStrategy) {
            throw new Error('Custom content strategy not found')
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

        return {
          text: tweetText,
          hashtags,
          characterCount,
          isOverLimit: characterCount > TWEET_CHARACTER_LIMIT,
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid input: ${error.issues.map((i) => i.message).join(', ')}`)
        }

        console.error('Tweet generation error:', error)
        throw new Error('Failed to generate tweet')
      }
    }),
}) 
