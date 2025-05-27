import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../../lib/errors'
import { verifyAuth } from '../../middleware/auth'

const generateTweetBodySchema = z.object({
  content: z.string().min(1, 'Content is required'),
  tone: z.enum(['professional', 'casual', 'engaging', 'informative']).default('engaging'),
})

const TWEET_CHARACTER_LIMIT = 280

export async function tweetGenerationRoutes(fastify: FastifyInstance) {
  fastify.post('/generate-tweet', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { content, tone } = generateTweetBodySchema.parse(request.body)

      // Create system prompt based on tone and options
      const systemPrompt = `You are a social media expert specializing in creating engaging Twitter content.

TASK: Convert the provided content into a compelling tweet.

REQUIREMENTS:
- Keep it under ${TWEET_CHARACTER_LIMIT} characters
- Use a ${tone} tone
- Make it engaging and shareable
- Preserve the core message and key insights
- Use proper Twitter formatting (line breaks, emojis where appropriate)

TONE GUIDELINES:
- Professional: Clear, authoritative, industry-focused
- Casual: Friendly, conversational, relatable
- Engaging: Hook-driven, question-based, interactive
- Informative: Educational, fact-focused, value-driven

Return only the tweet text, nothing else.`

      const result = await generateText({
        model: google('gemini-1.5-pro-latest'),
        system: systemPrompt,
        prompt: `Convert this content into a ${tone} tweet:\n\n${content}`,
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
}
