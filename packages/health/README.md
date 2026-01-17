# @hominem/health-services

Health, workout, and mental wellness services for tracking workouts, mental health assessments, and health metrics.

## Installation

```bash
bun add @hominem/health-services
```

## Usage

```typescript
import {
  workoutService,
  mentalHealthService,
  recommendWorkoutInputSchema,
  assessMentalWellnessInputSchema
} from '@hominem/health-services'

// Get workout recommendations
const workout = await workoutService.recommendWorkout({
  fitnessLevel: 'intermediate',
  goals: ['strength', 'cardio'],
  availableTime: 45
})

// Mental health assessment
const assessment = await mentalHealthService.assessMentalWellness({
  mood: 'good',
  sleepQuality: 8,
  stressLevel: 3
})
```

## AI Tools

Health management AI tools are available for LLM agent integrations:

```typescript
import { health_tools } from '@hominem/health-services/tools'
```

## Services

- **workoutService** - Workout recommendations and tracking
- **mentalHealthService** - Mental wellness assessments
- **healthService** - General health metrics and tracking

## Types

All type schemas are available for validation using Zod.
