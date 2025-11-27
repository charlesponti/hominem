import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { generateObject } from 'ai'
import { z } from 'zod'
import { lmstudio } from '../utils/llm'
import { loadPrompt } from '../utils/prompts'

// Workout recommendation schema
export const WorkoutRecommendationSchema = z.object({
  title: z.string(),
  duration: z.string(),
  exercises: z.array(
    z.object({
      name: z.string(),
      sets: z.number(),
      reps: z.string(),
      restTime: z.string(),
    })
  ),
  notes: z.array(z.string()),
})

export function registerWorkoutTool(server: McpServer) {
  // Tool for workout recommendations based on user input
  server.tool(
    'recommend_workout',
    {
      input: z
        .object({
          fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
          goal: z.enum(['strength', 'endurance', 'weight_loss', 'muscle_gain', 'general_fitness']),
          timeAvailable: z.number().min(10).max(120),
          equipment: z.array(z.string()).optional(),
          limitations: z.array(z.string()).optional(),
        })
        .describe('User fitness parameters for workout recommendations'),
    },
    async ({ input }) => {
      try {
        const { fitnessLevel, goal, timeAvailable, equipment = [], limitations = [] } = input

        const prompt = loadPrompt('workout', {
          fitnessLevel,
          goal: goal.replace('_', ' '),
          timeAvailable: `${timeAvailable} minutes`,
          equipment: equipment.join(', ') || 'none specifically mentioned',
          limitations: limitations.join(', ') || 'none specifically mentioned',
        })

        const response = await generateObject({
          model: lmstudio('qwen/qwen3-4b-thinking-2507'),
          prompt,
          schema: WorkoutRecommendationSchema,
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
        console.error('[MCP Workout Error]', error)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  title: `Basic ${input.goal.replace('_', ' ')} Workout`,
                  duration: `${input.timeAvailable} minutes`,
                  exercises: [
                    { name: 'Push-ups', sets: 3, reps: '10-12', restTime: '60 seconds' },
                    { name: 'Squats', sets: 3, reps: '10-12', restTime: '60 seconds' },
                    { name: 'Walking', sets: 1, reps: '10 minutes', restTime: 'N/A' },
                  ],
                  notes: ["Error generating custom workout. Here's a basic alternative."],
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
