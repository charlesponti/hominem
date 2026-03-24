import { recommendWorkoutTool, assessMentalWellnessTool } from '@hominem/health-services/tools';
import { createNoteTool, listNotesTool } from '@hominem/notes-services';
import type { ToolSet } from 'ai';

export const getAvailableTools = (userId: string): ToolSet => ({
  create_note: createNoteTool(userId),
  list_notes: listNotesTool(userId),
  recommend_workout: recommendWorkoutTool,
  assess_mental_wellness: assessMentalWellnessTool,
});
