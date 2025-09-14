import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { generateObject } from 'ai'
import { z } from 'zod'
import { lmstudio } from '../utils/llm'
import { loadPrompt } from '../utils/prompts'

// Nutrition analysis schema
export const NutritionAnalysisSchema = z.object({
  nutritionalQuality: z.string(),
  macroEstimate: z.object({
    protein: z.string(),
    carbohydrates: z.string(),
    fats: z.string(),
  }),
  calorieEstimate: z.string(),
  suggestions: z.array(z.string()),
  concerns: z.array(z.string()).optional(),
})

export function registerNutritionTool(server: McpServer) {
  // Nutrition analysis tool
  server.tool(
    'analyze_nutrition',
    {
      input: z
        .object({
          meals: z.array(z.string()),
          dietaryPreferences: z.array(z.string()).optional(),
          calorieTarget: z.number().optional(),
        })
        .describe('Nutrition information to analyze'),
    },
    async ({ input }) => {
      try {
        const { meals, dietaryPreferences = [], calorieTarget } = input

        const calorieTargetText = calorieTarget
          ? `CALORIE TARGET: ${calorieTarget} calories per day`
          : ''

        const prompt = loadPrompt('nutrition', {
          meals: meals.join('\n'),
          dietaryPreferences: dietaryPreferences.join(', ') || 'None specified',
          calorieTargetText,
        })

        const response = await generateObject({
          model: lmstudio('gemma-3-12b-it'),
          prompt,
          schema: NutritionAnalysisSchema,
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
        console.error('[MCP Nutrition Error]', error)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  nutritionalQuality: 'Unable to assess',
                  macroEstimate: {
                    protein: 'Unknown',
                    carbohydrates: 'Unknown',
                    fats: 'Unknown',
                  },
                  calorieEstimate: 'Unable to calculate',
                  suggestions: [
                    'Please try again or consult with a registered dietitian for personalized advice.',
                  ],
                  concerns: ['Analysis failed due to technical issues.'],
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
