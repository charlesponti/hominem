import * as z from 'zod';

export const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.string(),
  restTime: z.string(),
});

export const recommendWorkoutInputSchema = z.object({
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe('Current fitness level'),
  goal: z
    .enum(['strength', 'endurance', 'weight_loss', 'muscle_gain', 'general_fitness'])
    .describe('Primary fitness goal'),
  timeAvailable: z.number().min(10).max(120).describe('Time available for workout in minutes'),
  equipment: z
    .array(z.string())
    .optional()
    .describe('Available equipment (e.g., dumbbells, barbell, kettlebell)'),
  limitations: z
    .array(z.string())
    .optional()
    .describe('Physical limitations or injuries to consider'),
});

export const recommendWorkoutOutputSchema = z.object({
  title: z.string(),
  duration: z.string(),
  exercises: z.array(ExerciseSchema),
  notes: z.array(z.string()),
});

export class WorkoutService {
  async recommend(_: z.infer<typeof recommendWorkoutInputSchema>) {
    return { title: 'Quick Workout', duration: '30 minutes', exercises: [], notes: [] };
  }
}

export const workoutService = new WorkoutService();
