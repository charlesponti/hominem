/**
 * Computed Interview Types
 *
 * This file contains all derived types computed from the Interview schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from interviews.schema.ts
 */

import type {
  Interview,
  InterviewInsert,
  InterviewSelect,
  NewInterview,
  InterviewInterviewer,
  InterviewInterviewerInsert,
  NewInterviewInterviewer,
} from './interviews.schema';

export type {
  Interview,
  InterviewInsert,
  InterviewSelect,
  NewInterview,
  InterviewInterviewer,
  InterviewInterviewerInsert,
  NewInterviewInterviewer,
};

// Legacy aliases for backward compatibility
export type InterviewOutput = Interview;
export type InterviewInput = InterviewInsert;

export type InterviewInterviewerOutput = InterviewInterviewer;
export type InterviewInterviewerInput = InterviewInterviewerInsert;
