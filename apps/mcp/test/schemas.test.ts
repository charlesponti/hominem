import { describe, expect, it } from 'vitest'
import { WorkoutRecommendationSchema } from '../src/tools/workout'
import { NutritionAnalysisSchema } from '../src/tools/nutrition'
import { SleepAnalysisSchema } from '../src/tools/sleep'

describe('Tool Schema Validation', () => {
  describe('Workout Schema', () => {
    it('should validate correct workout data', () => {
      const validData = {
        title: 'Morning Workout',
        duration: '30 minutes',
        exercises: [
          {
            name: 'Push-ups',
            sets: 3,
            reps: '10-12',
            restTime: '60 seconds',
          },
          {
            name: 'Squats',
            sets: 3,
            reps: '15',
            restTime: '45 seconds',
          },
        ],
        notes: ['Warm up before starting', 'Cool down after'],
      }

      const result = WorkoutRecommendationSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.title).toBe('Morning Workout')
        expect(result.data.exercises).toHaveLength(2)
      }
    })

    it('should reject workout data missing required fields', () => {
      const invalidData = {
        title: 'Test Workout',
        // missing duration, exercises, notes
      }

      const result = WorkoutRecommendationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject workout with invalid exercise structure', () => {
      const invalidData = {
        title: 'Test Workout',
        duration: '30 minutes',
        exercises: [
          {
            name: 'Push-ups',
            // missing sets, reps, restTime
          },
        ],
        notes: [],
      }

      const result = WorkoutRecommendationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Nutrition Schema', () => {
    it('should validate correct nutrition data', () => {
      const validData = {
        nutritionalQuality: 'Excellent',
        macroEstimate: {
          protein: '150g',
          carbohydrates: '200g',
          fats: '60g',
        },
        calorieEstimate: '2100 calories',
        suggestions: ['Increase water intake', 'Add more vegetables'],
        concerns: ['High sodium'],
      }

      const result = NutritionAnalysisSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.nutritionalQuality).toBe('Excellent')
        expect(result.data.suggestions).toHaveLength(2)
      }
    })

    it('should validate nutrition data without optional concerns', () => {
      const validData = {
        nutritionalQuality: 'Good',
        macroEstimate: {
          protein: '120g',
          carbohydrates: '180g',
          fats: '50g',
        },
        calorieEstimate: '1800 calories',
        suggestions: ['Maintain current diet'],
      }

      const result = NutritionAnalysisSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject nutrition data missing required fields', () => {
      const invalidData = {
        nutritionalQuality: 'Good',
        // missing macroEstimate, calorieEstimate, suggestions
      }

      const result = NutritionAnalysisSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Sleep Schema', () => {
    it('should validate correct sleep data', () => {
      const validData = {
        qualityScore: 85,
        sleepCycleSummary: '5 complete cycles',
        recommendations: [
          'Maintain consistent sleep schedule',
          'Avoid screens before bed',
        ],
        insights: 'Good sleep quality with minimal disruptions',
      }

      const result = SleepAnalysisSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.qualityScore).toBe(85)
        expect(result.data.recommendations).toHaveLength(2)
      }
    })

    it('should validate sleep data at boundaries', () => {
      const minScore = {
        qualityScore: 0,
        sleepCycleSummary: 'Poor sleep',
        recommendations: ['Seek medical advice'],
        insights: 'Very poor sleep quality',
      }

      const maxScore = {
        qualityScore: 100,
        sleepCycleSummary: 'Perfect sleep',
        recommendations: ['Keep it up!'],
        insights: 'Excellent sleep quality',
      }

      expect(SleepAnalysisSchema.safeParse(minScore).success).toBe(true)
      expect(SleepAnalysisSchema.safeParse(maxScore).success).toBe(true)
    })

    it('should reject sleep data with out-of-range quality score', () => {
      const tooLow = {
        qualityScore: -1,
        sleepCycleSummary: 'Invalid',
        recommendations: [],
        insights: 'Invalid',
      }

      const tooHigh = {
        qualityScore: 101,
        sleepCycleSummary: 'Invalid',
        recommendations: [],
        insights: 'Invalid',
      }

      expect(SleepAnalysisSchema.safeParse(tooLow).success).toBe(false)
      expect(SleepAnalysisSchema.safeParse(tooHigh).success).toBe(false)
    })

    it('should reject sleep data missing required fields', () => {
      const invalidData = {
        qualityScore: 75,
        // missing sleepCycleSummary, recommendations, insights
      }

      const result = SleepAnalysisSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
