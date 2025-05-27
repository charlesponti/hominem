import { z } from 'zod'

export const ContentStrategySchema = z.object({
  topic: z.string().describe('The main topic of the content strategy'),
  targetAudience: z.string().describe('Target audience for the content'),
  platforms: z.array(z.string()).optional().describe('Social media platforms targeted'),
  keyInsights: z.array(z.string()).optional().describe('Key insights from the strategy'),
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
})

export type ContentStrategy = z.infer<typeof ContentStrategySchema>
