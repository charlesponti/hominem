import { recommendWorkoutTool, assessMentalWellnessTool } from '@hominem/health-services/tools';
import type { ToolSet } from 'ai';

export const getAvailableTools = (_userId: string): ToolSet => ({
  recommend_workout: recommendWorkoutTool,
  assess_mental_wellness: assessMentalWellnessTool,
});
