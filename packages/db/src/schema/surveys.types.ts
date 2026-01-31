/**
 * Computed Survey Types
 *
 * This file contains all derived types computed from the Survey schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from surveys.schema.ts
 */

import type {
  Survey,
  SurveyInsert,
  SurveySelect,
  SurveyOption,
  SurveyOptionInsert,
  SurveyOptionSelect,
  SurveyVote,
  SurveyVoteInsert,
  SurveyVoteSelect,
} from './surveys.schema';

export type {
  Survey,
  SurveyInsert,
  SurveySelect,
  SurveyOption,
  SurveyOptionInsert,
  SurveyOptionSelect,
  SurveyVote,
  SurveyVoteInsert,
  SurveyVoteSelect,
};

// Legacy aliases for backward compatibility
export type SurveyOutput = Survey;
export type SurveyInput = SurveyInsert;

export type SurveyOptionOutput = SurveyOption;
export type SurveyOptionInput = SurveyOptionInsert;

export type SurveyVoteOutput = SurveyVote;
export type SurveyVoteInput = SurveyVoteInsert;
