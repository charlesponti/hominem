#!/usr/bin/env node

import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { McpServer as Server } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'

const llm = createOpenAICompatible({
  name: 'lmstudio',
  baseURL: 'http://localhost:1234/v1',
})

// Create an MCP server
const server = new Server({
  name: 'health-and-fitness-server',
  version: '0.1.0',
})

// Workout recommendation schema
const WorkoutRecommendationSchema = z.object({
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

      const response = await generateObject({
        model: llm('qwen2.5-7b-instruct-1m'),
        prompt: `
          You are a professional fitness coach creating a personalized workout plan. Based on the following parameters:
          
          - Fitness Level: ${fitnessLevel}
          - Goal: ${goal.replace('_', ' ')}
          - Available Time: ${timeAvailable} minutes
          - Available Equipment: ${equipment.join(', ') || 'none specifically mentioned'}
          - Limitations or Injuries: ${limitations.join(', ') || 'none specifically mentioned'}
          
          Create a structured workout plan. Provide specific exercises with sets, reps, and rest times appropriate for the fitness level and goal.
          Include helpful notes, especially if there are limitations to consider.
        `,
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
      console.error('[MCP Health Error]', error)
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

// Nutrition analysis schema
const NutritionAnalysisSchema = z.object({
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

      const response = await generateObject({
        model: llm('qwen2.5-7b-instruct-1m'),
        prompt: `
          You are a professional nutritionist analyzing a food diary. Provide a detailed but concise analysis of the following meals:
          
          MEALS:
          ${meals.join('\n')}
          
          DIETARY PREFERENCES:
          ${dietaryPreferences.length > 0 ? dietaryPreferences.join(', ') : 'None specified'}
          
          ${calorieTarget ? `CALORIE TARGET: ${calorieTarget} calories per day` : ''}
          
          Provide a nutritional assessment that includes:
          1. Overall nutritional quality
          2. Estimated macronutrient balance (protein, carbs, fats)
          3. Rough calorie estimate
          4. 2-4 specific, actionable suggestions for improvement
          5. Any nutritional concerns you identify
          
          Keep your analysis evidence-based and practical.
        `,
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
      console.error('[MCP Health Error]', error)
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

// Sleep analysis schema
const SleepAnalysisSchema = z.object({
  qualityScore: z.number().min(0).max(100),
  sleepCycleSummary: z.string(),
  recommendations: z.array(z.string()),
  insights: z.string(),
})

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

      const response = await generateObject({
        model: llm('qwen2.5-7b-instruct-1m'),
        prompt: `
          You are a sleep specialist analyzing sleep data. Based on the following information:
          
          - Hours Slept: ${hoursSlept} hours
          - Bedtime: ${bedTime}
          - Wake Time: ${wakeTime}
          - Number of wake-ups during sleep: ${wakeupCount}
          ${sleepQualitySelfRating ? `- Self-Rated Sleep Quality (1-10): ${sleepQualitySelfRating}` : ''}
          
          Provide a sleep analysis that includes:
          1. A sleep quality score from 0-100
          2. An analysis of approximate sleep cycles completed
          3. 2-4 specific, actionable recommendations
          4. One key insight about the sleep pattern
          
          Your analysis should be evidence-based and aligned with sleep science best practices.
        `,
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
      console.error('[MCP Health Error]', error)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                qualityScore: input.sleepQualitySelfRating ? input.sleepQualitySelfRating * 10 : 50,
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

// Mental wellness assessment schema
const MentalWellnessSchema = z.object({
  overallAssessment: z.string(),
  stressLevel: z.number().min(1).max(10),
  copingStrategies: z.array(z.string()),
  recommendations: z.array(z.string()),
  positiveAffirmation: z.string(),
})

// New tool: Mental wellness assessment
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

      const response = await generateObject({
        model: llm('qwen2.5-7b-instruct-1m'),
        prompt: `
          You are a compassionate mental health professional providing supportive guidance. Based on the following information:
          
          - Stress Description: "${stressDescription}"
          - Current Mood Rating (1-10): ${moodRating}
          - Recent Challenges: ${recentChallenges.join(', ') || 'None specified'}
          - Current Coping Strategies: ${currentCopingStrategies.join(', ') || 'None specified'}
          
          Provide a brief mental wellness assessment that includes:
          1. A thoughtful overall assessment of the person's situation
          2. An estimated stress level (1-10)
          3. 2-3 evidence-based coping strategies tailored to their situation
          4. 2-3 specific, actionable recommendations for improving mental wellbeing
          5. One supportive, non-cliché positive affirmation
          
          Your response should be compassionate, non-judgmental, and practical. Avoid generic advice.
        `,
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
                overallAssessment: 'Unable to provide detailed assessment due to technical issues',
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

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
await server.connect(transport)
