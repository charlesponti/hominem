import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { generateObject } from 'ai'
import { z } from 'zod'
import { lmstudio } from '../utils/llm'
import { loadPrompt } from '../utils/prompts'

// Sleep analysis schema
export const SleepAnalysisSchema = z.object({
  qualityScore: z.number().min(0).max(100),
  sleepCycleSummary: z.string(),
  recommendations: z.array(z.string()),
  insights: z.string(),
})

export function registerSleepTool(server: McpServer) {
  // Sleep quality analyzer
  server.tool(
    'analyze_sleep',
    {
      input: z
        .object({
          hoursSlept: z.number().min(0).max(24),
          bedTime: z.string(),
          wakeTime: z.string(),
          wakeupCount: z.number().optional(),
          sleepQualitySelfRating: z.number().min(1).max(10).optional(),
        })
        .describe('Sleep metrics to analyze'),
    },
    async ({ input }) => {
      try {
        const { hoursSlept, bedTime, wakeTime, wakeupCount = 0, sleepQualitySelfRating } = input

        const sleepQualitySelfRatingText = sleepQualitySelfRating
          ? `- Self-Rated Sleep Quality (1-10): ${sleepQualitySelfRating}`
          : ''

        const prompt = loadPrompt('sleep', {
          hoursSlept: `${hoursSlept} hours`,
          bedTime,
          wakeTime,
          wakeupCount: `${wakeupCount} times`,
          sleepQualitySelfRatingText,
        })

        const response = await generateObject({
          model: lmstudio('gemma-3-12b-it'),
          prompt,
          schema: SleepAnalysisSchema,
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
        console.error('[MCP Sleep Error]', error)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  qualityScore: input.sleepQualitySelfRating
                    ? input.sleepQualitySelfRating * 10
                    : 50,
                  sleepCycleSummary: `Approximately ${Math.floor(input.hoursSlept / 1.5)} sleep cycles`,
                  recommendations: [
                    'Aim for 7-9 hours of quality sleep each night',
                    'Maintain a consistent sleep schedule',
                    'Create a relaxing bedtime routine',
                  ],
                  insights: 'Basic analysis provided due to error in detailed processing',
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
