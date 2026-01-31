/**
 * Computed Interview Types
 *
 * This file contains all derived types computed from Interview schema.
 * These types are inferred from Drizzle ORM schema definitions.
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { interviews, interview_interviewers } from './interviews.schema'

// Inferred types from Drizzle schema
export type Interview = InferSelectModel<typeof interviews>
export type InterviewInsert = InferInsertModel<typeof interviews>
export type InterviewInterviewer = InferSelectModel<typeof interview_interviewers>
export type InterviewInterviewerInsert = InferInsertModel<typeof interview_interviewers>

// Legacy aliases for backward compatibility
export type InterviewOutput = Interview
export type InterviewInput = InterviewInsert

export type InterviewInterviewerOutput = InterviewInterviewer
export type InterviewInterviewerInput = InterviewInterviewerInsert

// Re-export tables for convenience
export { interviews, interview_interviewers } from './interviews.schema'
