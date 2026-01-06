import { recommendWorkoutInputSchema, recommendWorkoutOutputSchema } from '@hominem/data/health'
import { toolDefinition } from '@tanstack/ai'

export const recommendWorkoutDef = toolDefinition({
  name: 'recommend_workout',
  description: 'Get personalized workout recommendations based on fitness level and goals',
  inputSchema: recommendWorkoutInputSchema,
  outputSchema: recommendWorkoutOutputSchema,
})
