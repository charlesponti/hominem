import {
  recommendWorkoutDef,
  assessMentalWellnessDef,
  recommendWorkoutServer,
  assessMentalWellnessServer,
} from '@hominem/health-services/tools';
import {
  createNoteDef,
  listNotesDef,
  createNoteServerForUser,
  listNotesServerForUser,
} from '@hominem/notes-services';

/**
 * Export TanStack AI tools with server implementations
 * Each tool is set up with its `.server()` implementation for execution
 */
export const getAvailableTools = (userId: string): unknown[] => [
  // Notes
  createNoteDef.server(createNoteServerForUser(userId)),
  listNotesDef.server(listNotesServerForUser(userId)),

  // Wellness
  recommendWorkoutDef.server(recommendWorkoutServer),
  assessMentalWellnessDef.server(assessMentalWellnessServer),
];
