import { tool } from 'ai';
import * as z from 'zod';

import { assessMentalWellnessInputSchema, mentalHealthService } from './mental-health.service';
import { recommendWorkoutInputSchema, workoutService } from './workout.service';

// Activity schema used across inputs/outputs
export const ActivitySchema = z.object({
  activityId: z.string().optional(),
  activityType: z.string().describe('Type of activity (e.g., "running", "cycling")'),
  duration: z.number().describe('Duration of activity in minutes'),
  caloriesBurned: z.number().describe('Calories burned during activity'),
  date: z.string().describe('Date of activity (YYYY-MM-DD)'),
  notes: z.string().optional().describe('Additional notes about the activity'),
});

// Log activity
export const logHealthActivityInputSchema = ActivitySchema.omit({ activityId: true });
export const logHealthActivityOutputSchema = z.object({
  message: z.string(),
  activityId: z.string().optional(),
});

export const logHealthActivityServer = async (
  input: z.infer<typeof logHealthActivityInputSchema>,
) => {
  const args = input;
  return {
    message: `Logged ${args.activityType} activity for ${args.duration} minutes on ${args.date}`,
    activityId: `activity_${Date.now()}`,
  };
};

// Get activities
export const getHealthActivitiesInputSchema = z.object({
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
  activityType: z.string().optional().describe('Filter by activity type'),
});
export const getHealthActivitiesOutputSchema = z.object({ activities: z.array(ActivitySchema) });

export const getHealthActivitiesServer = async (
  _input: z.infer<typeof getHealthActivitiesInputSchema>,
) => {
  return { activities: [] as z.infer<typeof ActivitySchema>[] };
};

// Update activity
export const updateHealthActivityInputSchema = z.object({
  activityId: z.string().describe('ID of the activity to update'),
  activityType: z.string().optional().describe('New type of activity'),
  duration: z.number().optional().describe('New duration in minutes'),
  caloriesBurned: z.number().optional().describe('New calories burned'),
  notes: z.string().optional().describe('New notes'),
});
export const updateHealthActivityOutputSchema = z.object({
  message: z.string(),
  updatedActivity: ActivitySchema.optional(),
});

export const updateHealthActivityServer = async (
  input: z.infer<typeof updateHealthActivityInputSchema>,
) => {
  return { message: `Updated health activity ${input.activityId}`, updatedActivity: { ...input } };
};

// Delete activity
export const deleteHealthActivityInputSchema = z.object({
  activityId: z.string().describe('ID of the activity to delete'),
});
export const deleteHealthActivityOutputSchema = z.object({
  message: z.string(),
  deleted: z.boolean(),
});

export const deleteHealthActivityServer = async (
  input: z.infer<typeof deleteHealthActivityInputSchema>,
) => ({ message: `Deleted health activity ${input.activityId}`, deleted: true });

export const recommendWorkoutServer = async (input: z.infer<typeof recommendWorkoutInputSchema>) =>
  workoutService.recommend(input);

export const assessMentalWellnessServer = async (
  input: z.infer<typeof assessMentalWellnessInputSchema>,
) => mentalHealthService.assess(input);

export const logHealthActivityTool = tool({
  description: 'Log a health activity',
  parameters: logHealthActivityInputSchema,
  execute: logHealthActivityServer,
});

export const getHealthActivitiesTool = tool({
  description: 'Get health activities',
  parameters: getHealthActivitiesInputSchema,
  execute: getHealthActivitiesServer,
});

export const updateHealthActivityTool = tool({
  description: 'Update a health activity',
  parameters: updateHealthActivityInputSchema,
  execute: updateHealthActivityServer,
});

export const deleteHealthActivityTool = tool({
  description: 'Delete a health activity',
  parameters: deleteHealthActivityInputSchema,
  execute: deleteHealthActivityServer,
});

export const recommendWorkoutTool = tool({
  description: 'Get personalized workout recommendations based on fitness level and goals',
  parameters: recommendWorkoutInputSchema,
  execute: recommendWorkoutServer,
});

export const assessMentalWellnessTool = tool({
  description: 'Assess mental wellness and get personalized coping strategies and recommendations',
  parameters: assessMentalWellnessInputSchema,
  execute: assessMentalWellnessServer,
});
