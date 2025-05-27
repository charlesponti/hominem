import { google } from '@ai-sdk/google'
import { generateObject, tool } from 'ai'
import { z } from 'zod'
import { ContentStrategySchema } from '../schemas'

export const content_generator = tool({
  description: 'Generate comprehensive content strategy from a simple topic idea',
  parameters: z.object({
    topic: z.string().describe('The main topic or idea to generate content around'),
    audience: z.string().optional().describe('Target audience for the content'),
    platforms: z
      .array(z.string())
      .optional()
      .describe('List of platforms to generate content for (e.g., blog, twitter, instagram)'),
  }),
  async execute(args: { topic: string; audience?: string; platforms?: string[] }) {
    const { topic, audience = 'general', platforms = ['blog', 'twitter', 'instagram'] } = args

    // Build a detailed prompt for the LLM
    const prompt = `
      Create a comprehensive content strategy for the topic: "${topic}"
      Be creative, strategic, and ensure all content ideas are tailored to both the topic and audience.
      Target audience: ${audience}
      Platforms to focus on: ${platforms.join(', ')}
    `

    try {
      const result = await generateObject({
        model: google('gemini-1.5-pro-latest'),
        system:
          'You are a professional content strategist who helps create comprehensive content plans tailored to specific topics and audiences.',
        prompt,
        schema: ContentStrategySchema,
      })

      return result.object
    } catch (error) {
      console.error('Error generating content strategy:', error)

      // Fallback to a basic structure if the LLM call fails
      return {
        topic: topic,
        targetAudience: audience,
        keyInsights: [`Key insight about ${topic} for ${audience}`],
        contentPlan: {
          blog: {
            title: `Guide to ${topic}`,
            outline: [{ heading: 'Introduction', content: `Overview of ${topic}` }],
            wordCount: 1000,
            seoKeywords: [`${topic}`],
            callToAction: `Learn more about ${topic}`,
          },
          socialMedia: platforms.map((platform) => ({
            platform,
            contentIdeas: [`${topic} content idea`],
            hashtagSuggestions: [`#${topic.replace(/\s+/g, '')}`],
            bestTimeToPost: '9AM-5PM',
          })),
          visualContent: {
            infographicIdeas: [`${topic} infographic`],
            imageSearchTerms: [`${topic}`],
          },
        },
        monetization: [`${topic} product`],
        competitiveAnalysis: {
          gaps: `Content gap for ${topic}`,
          opportunities: `Opportunity for ${topic}`,
        },
      }
    }
  },
})
