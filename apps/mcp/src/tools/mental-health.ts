import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { generateObject } from 'ai'
import { z } from 'zod'
import { lmstudio } from '../utils/llm'
import { loadPrompt } from '../utils/prompts'

// Mental wellness assessment schema
export const MentalWellnessSchema = z.object({
  overallAssessment: z.string(),
  stressLevel: z.number().min(1).max(10),
  copingStrategies: z.array(z.string()),
  recommendations: z.array(z.string()),
  positiveAffirmation: z.string(),
})

export function registerMentalWellnessTool(server: McpServer) {
  // Mental wellness assessment
  server.tool(
    'assess_mental_wellness',
    {
      input: z
        .object({
          stressDescription: z.string(),
          moodRating: z.number().min(1).max(10),
          recentChallenges: z.array(z.string()).optional(),
          currentCopingStrategies: z.array(z.string()).optional(),
        })
        .describe('Mental wellness information to analyze'),
    },
    async ({ input }) => {
      try {
        const {
          stressDescription,
          moodRating,
          recentChallenges = [],
          currentCopingStrategies = [],
        } = input

        const prompt = loadPrompt('mentalWellness', {
          stressDescription,
          moodRating: `${moodRating} out of 10`,
          recentChallenges: recentChallenges.join(', ') || 'None specified',
          currentCopingStrategies: currentCopingStrategies.join(', ') || 'None specified',
        })

        const response = await generateObject({
          model: lmstudio('gemma-3-12b-it'),
          prompt,
          schema: MentalWellnessSchema,
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.object, null, 2),
            },
          ],
        }
      } catch (error) {
        console.error('[MCP Health Error]', error)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  overallAssessment:
                    'Unable to provide detailed assessment due to technical issues',
                  stressLevel: input.moodRating <= 5 ? 8 : 5,
                  copingStrategies: [
                    'Deep breathing exercises',
                    'Mindful walking',
                    'Journaling thoughts and feelings',
                  ],
                  recommendations: [
                    'Consider speaking with a mental health professional',
                    'Maintain social connections',
                    'Practice regular self-care activities',
                  ],
                  positiveAffirmation: 'You have the strength to navigate this challenging time.',
                },
                null,
                2
              ),
            },
          ],
        }
      }
    }
  )
}
