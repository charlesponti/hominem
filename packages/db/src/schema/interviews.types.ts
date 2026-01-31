/**
 * Computed Interview Types
 */

import type {
  Interview,
  InterviewInsert,
  InterviewInterviewer,
  InterviewInterviewerInsert,
} from './interviews.schema';

export type InterviewOutput = Interview;
export type InterviewInput = InterviewInsert;

export type InterviewInterviewerOutput = InterviewInterviewer;
export type InterviewInterviewerInput = InterviewInterviewerInsert;
