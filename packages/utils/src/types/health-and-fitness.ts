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

// Health and Wellness
export type HealthProfile = {
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
  physicalHealth?: {
    height?: number
    weight?: number
    bodyMassIndex?: number
    chronicConditions?: string[]
    fitnessLevel?: number // 0-100 scale
  }
  allergies?: string[]
  nutritionalPreferences?: {
    diet: 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto' | 'paleo'
  }
  sleepPatterns?: {
    averageHoursPerNight?: number
    qualityOfSleep?: number // 0-100 scale
    preferredSleepCycle?: 'early bird' | 'night owl'
  }
  mentalWellness?: {
    meditationPractice?: boolean
    stressManagementTechniques?: string[]
  }
}
