import {
  assessMentalWellnessInputSchema,
  assessMentalWellnessOutputSchema,
} from '@hominem/health-services'
import { toolDefinition } from '@tanstack/ai'

export const assessMentalWellnessDef = toolDefinition({
  name: 'assess_mental_wellness',
  description: 'Assess mental wellness and get personalized coping strategies and recommendations',
  inputSchema: assessMentalWellnessInputSchema,
  outputSchema: assessMentalWellnessOutputSchema,
})
