import { z } from 'zod'

export const strengthMetricsSchema = z.object({
  maximalStrength: z.number(), // One-rep max (kg or lbs)
  relativeStrength: z.number(), // Strength-to-bodyweight ratio
  gripStrength: z.number(), // Measured in kg or lbs
})

export const enduranceMetricsSchema = z.object({
  cardiovascularEndurance: z.number(), // VO2 max or distance (meters)
  muscularEndurance: z.number(), // Reps of a given exercise
  heartRateRecovery: z.number(), // Heart rate recovery (bpm)
})

export const speedAndPowerSchema = z.object({
  sprintSpeed: z.number(), // Time in seconds for a set distance
  powerOutput: z.number(), // Measured in watts or vertical jump height (cm)
})

export const flexibilityAndMobilitySchema = z.object({
  jointRangeOfMotion: z.number(), // Degrees or distance in cm
  dynamicMobility: z.number(), // Score from mobility tests
})

export const agilityAndCoordinationSchema = z.object({
  agility: z.number(), // Time or score from agility tests
  balance: z.number(), // Balance test score
})

export const bodyCompositionSchema = z.object({
  muscleMass: z.number(), // Percentage or mass (kg)
  bodyFatPercentage: z.number(), // Percentage
})

export const workoutPerformanceSchema = z.object({
  trainingVolume: z.number(), // Total volume in kg or distance
  consistency: z.number(), // Days per week or adherence percentage
  progression: z.number(), // Improvement percentage
})

export const recoveryAndResilienceSchema = z.object({
  recoveryTime: z.number(), // Time in hours or days
  sleepQuality: z.number(), // Score from 1-10
})

export const functionalFitnessSchema = z.object({
  dailyTaskPerformance: z.number(), // Functional task score
  movementEfficiency: z.number(), // Efficiency score
})

export const sportSpecificMetricsSchema = z.object({
  skillProficiency: z.number().optional(), // Score for specific skill
  reactionTime: z.number().optional(), // Measured in milliseconds
})

export const healthProfileSchema = z.object({
  strength: strengthMetricsSchema,
  endurance: enduranceMetricsSchema,
  speedAndPower: speedAndPowerSchema,
  flexibilityAndMobility: flexibilityAndMobilitySchema,
  agilityAndCoordination: agilityAndCoordinationSchema,
  bodyComposition: bodyCompositionSchema,
  workoutPerformance: workoutPerformanceSchema,
  recoveryAndResilience: recoveryAndResilienceSchema,
  functionalFitness: functionalFitnessSchema,
  sportSpecificMetrics: sportSpecificMetricsSchema.optional(),
  physicalHealth: z
    .object({
      height: z.number().optional(),
      weight: z.number().optional(),
      bodyMassIndex: z.number().optional(),
      chronicConditions: z.array(z.string()).optional(),
      fitnessLevel: z.number().optional(), // 0-100 scale
    })
    .optional(),
  allergies: z.array(z.string()).optional(),
  nutritionalPreferences: z
    .object({
      diet: z.enum(['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo']),
    })
    .optional(),
  sleepPatterns: z
    .object({
      averageHoursPerNight: z.number().optional(),
      qualityOfSleep: z.number().optional(), // 0-100 scale
      preferredSleepCycle: z.enum(['early bird', 'night owl']).optional(),
    })
    .optional(),
  mentalWellness: z
    .object({
      meditationPractice: z.boolean().optional(),
      stressManagementTechniques: z.array(z.string()).optional(),
    })
    .optional(),
})

// Export types inferred from schemas
export type StrengthMetrics = z.infer<typeof strengthMetricsSchema>
export type EnduranceMetrics = z.infer<typeof enduranceMetricsSchema>
export type SpeedAndPower = z.infer<typeof speedAndPowerSchema>
export type FlexibilityAndMobility = z.infer<typeof flexibilityAndMobilitySchema>
export type AgilityAndCoordination = z.infer<typeof agilityAndCoordinationSchema>
export type BodyComposition = z.infer<typeof bodyCompositionSchema>
export type WorkoutPerformance = z.infer<typeof workoutPerformanceSchema>
export type RecoveryAndResilience = z.infer<typeof recoveryAndResilienceSchema>
export type FunctionalFitness = z.infer<typeof functionalFitnessSchema>
export type SportSpecificMetrics = z.infer<typeof sportSpecificMetricsSchema>
export type HealthProfile = z.infer<typeof healthProfileSchema>
