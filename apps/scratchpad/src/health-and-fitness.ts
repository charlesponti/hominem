interface StrengthMetrics {
  maximalStrength: number // One-rep max (kg or lbs)
  relativeStrength: number // Strength-to-bodyweight ratio
  gripStrength: number // Measured in kg or lbs
}

interface EnduranceMetrics {
  cardiovascularEndurance: number // VO2 max or distance (meters)
  muscularEndurance: number // Reps of a given exercise
  heartRateRecovery: number // Heart rate recovery (bpm)
}
interface SpeedAndPower {
  sprintSpeed: number // Time in seconds for a set distance
  powerOutput: number // Measured in watts or vertical jump height (cm)
}

interface FlexibilityAndMobility {
  jointRangeOfMotion: number // Degrees or distance in cm
  dynamicMobility: number // Score from mobility tests
}

interface AgilityAndCoordination {
  agility: number // Time or score from agility tests
  balance: number // Balance test score
}

interface BodyComposition {
  muscleMass: number // Percentage or mass (kg)
  bodyFatPercentage: number // Percentage
}

interface WorkoutPerformance {
  trainingVolume: number // Total volume in kg or distance
  consistency: number // Days per week or adherence percentage
  progression: number // Improvement percentage
}

interface RecoveryAndResilience {
  recoveryTime: number // Time in hours or days
  sleepQuality: number // Score from 1-10
}

interface FunctionalFitness {
  dailyTaskPerformance: number // Functional task score
  movementEfficiency: number // Efficiency score
}

interface SportSpecificMetrics {
  skillProficiency?: number // Score for specific skill
  reactionTime?: number // Measured in milliseconds
}

// Define the structure for the total fitness metrics
export type FitnessMetrics = {
  strength: StrengthMetrics
  endurance: EnduranceMetrics
  speedAndPower: SpeedAndPower
  flexibilityAndMobility: FlexibilityAndMobility
  agilityAndCoordination: AgilityAndCoordination
  bodyComposition: BodyComposition
  workoutPerformance: WorkoutPerformance
  recoveryAndResilience: RecoveryAndResilience
  functionalFitness: FunctionalFitness
  sportSpecificMetrics?: SportSpecificMetrics
}

// Define a function to update the metrics
export function updateFitnessMetrics(
  currentMetrics: FitnessMetrics,
  updates: Partial<FitnessMetrics>
): FitnessMetrics {
  return {
    ...currentMetrics,
    ...Object.keys(updates).reduce((acc, key) => {
      const metricKey = key as keyof FitnessMetrics
      if (typeof updates[metricKey] === 'object' && updates[metricKey] !== null) {
        acc[metricKey] = {
          ...currentMetrics[metricKey],
          ...updates[metricKey],
        }
      } else {
        acc[metricKey] = updates[metricKey]
      }
      return acc
    }, {} as FitnessMetrics),
  }
}

// AI tools for analyzing and updating fitness metrics
export const aiTools = {
  analyzeStrength: (input: string) => {
    const strengthIndicators = {
      maximal: ['max', '1rm', 'one rep', 'heaviest', 'strongest'],
      relative: ['bodyweight', 'ratio', 'relative'],
      grip: ['grip', 'hold', 'grasp', 'hanging'],
    }

    const updates: Partial<FitnessMetrics['strength']> = {}
    const normalizedInput = input.toLowerCase()

    if (strengthIndicators.maximal.some((i) => normalizedInput.includes(i))) {
      const value = extractNumericValue(normalizedInput)
      if (value) updates.maximalStrength = value
    }
    if (strengthIndicators.relative.some((i) => normalizedInput.includes(i))) {
      const value = extractNumericValue(normalizedInput)
      if (value) updates.relativeStrength = value
    }
    if (strengthIndicators.grip.some((i) => normalizedInput.includes(i))) {
      const value = extractNumericValue(normalizedInput)
      if (value) updates.gripStrength = value
    }

    return updates
  },

  analyzeEndurance: (input: string) => {
    const enduranceIndicators = {
      cardio: ['cardio', 'vo2', 'running', 'distance'],
      muscular: ['reps', 'repetitions', 'sets'],
      recovery: ['heart rate', 'bpm', 'recovery'],
    }

    const updates: Partial<FitnessMetrics['endurance']> = {}
    const formattedInput = input.toLowerCase()

    if (enduranceIndicators.cardio.some((i) => input.includes(i))) {
      const value = extractNumericValue(formattedInput)
      if (value) updates.cardiovascularEndurance = value
    }
    if (enduranceIndicators.muscular.some((i) => input.includes(i))) {
      const value = extractNumericValue(formattedInput)
      if (value) updates.muscularEndurance = value
    }
    if (enduranceIndicators.recovery.some((i) => input.includes(i))) {
      const value = extractNumericValue(formattedInput)
      if (value) updates.heartRateRecovery = value
    }

    return updates
  },
}

function extractNumericValue(input: string): number | null {
  const matches = input.match(/\d+(\.\d+)?/)
  return matches ? Number.parseFloat(matches[0]) : null
}
