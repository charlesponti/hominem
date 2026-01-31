/**
 * Computed Survey Types
 *
 * This file contains all derived types computed from Survey schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from surveys.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { surveys, surveyOptions, surveyVotes } from './surveys.schema'

// Inferred types from Drizzle schema
export type Survey = InferSelectModel<typeof surveys>
export type SurveyInsert = InferInsertModel<typeof surveys>

export type SurveyOption = InferSelectModel<typeof surveyOptions>
export type SurveyOptionInsert = InferInsertModel<typeof surveyOptions>

export type SurveyVote = InferSelectModel<typeof surveyVotes>
export type SurveyVoteInsert = InferInsertModel<typeof surveyVotes>

// Legacy aliases for backward compatibility
export type SurveyOutput = Survey
export type SurveyInput = SurveyInsert

export type SurveyOptionOutput = SurveyOption
export type SurveyOptionInput = SurveyOptionInsert

export type SurveyVoteOutput = SurveyVote
export type SurveyVoteInput = SurveyVoteInsert


