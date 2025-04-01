import { google } from '@ai-sdk/google'
import { generateObject, tool } from 'ai'
import { z } from 'zod'

const contentSchema = z.object({
  topic: z.string(),
  targetAudience: z.string(),
  keyInsights: z.array(z.string()),
  contentPlan: z.object({
    blog: z.object({
      title: z.string(),
      outline: z.array(z.object({ heading: z.string(), content: z.string() })),
      wordCount: z.number(),
      seoKeywords: z.array(z.string()),
      callToAction: z.string(),
    }),
    socialMedia: z.array(
      z.object({
        platform: z.string(),
        contentIdeas: z.array(z.string()),
        hashtagSuggestions: z.array(z.string()),
        bestTimeToPost: z.string(),
      })
    ),
    visualContent: z.object({
      infographicIdeas: z.array(z.string()),
      imageSearchTerms: z.array(z.string()),
    }),
  }),
  monetizationIdeas: z.array(z.string()),
  competitiveAnalysis: z.object({
    gaps: z.string(),
    opportunities: z.string(),
  }),
})

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
      Target audience: ${audience}
      Platforms to focus on: ${platforms.join(', ')}
      
      Structure the response as a detailed JSON object with the following structure:
      {
        "topic": "The main topic",
        "targetAudience": "The target audience",
        "keyInsights": ["Insight 1", "Insight 2", ...],
        "contentPlan": {
          "blog": {
            "title": "Blog title",
            "outline": [{"heading": "Section title", "content": "Section description"}, ...],
            "wordCount": number,
            "seoKeywords": ["keyword1", ...],
            "callToAction": "CTA text"
          },
          "socialMedia": [
            {
              "platform": "platform name",
              "contentIdeas": ["Idea 1", ...],
              "hashtagSuggestions": ["#hashtag1", ...],
              "bestTimeToPost": "time range"
            }
          ],
          "visualContent": {
            "infographicIdeas": ["Idea 1", ...],
            "imageSearchTerms": ["term 1", ...]
          }
        },
        "monetizationIdeas": ["Idea 1", ...],
        "competitiveAnalysis": {
          "gaps": "Description of content gaps",
          "opportunities": "Description of opportunities"
        }
      }
      
      Be creative, strategic, and ensure all content ideas are tailored to both the topic and audience.
    `

    try {
      const result = await generateObject({
        model: google('gemini-1.5-pro-latest'),
        system:
          'You are a professional content strategist who helps create comprehensive content plans tailored to specific topics and audiences.',
        prompt,
        schema: contentSchema,
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
        monetizationIdeas: [`${topic} product`],
        competitiveAnalysis: {
          gaps: `Content gap for ${topic}`,
          opportunities: `Opportunity for ${topic}`,
        },
      }
    }
  },
})
