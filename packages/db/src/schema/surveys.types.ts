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
/**
 * @deprecated Use {@link Survey} instead. This alias will be removed in a future version.
 */
export type SurveyOutput = Survey;

/**
 * @deprecated Use {@link SurveyInsert} instead. This alias will be removed in a future version.
 */
export type SurveyInput = SurveyInsert;

/**
 * @deprecated Use {@link SurveyOption} instead. This alias will be removed in a future version.
 */
export type SurveyOptionOutput = SurveyOption;

/**
 * @deprecated Use {@link SurveyOptionInsert} instead. This alias will be removed in a future version.
 */
export type SurveyOptionInput = SurveyOptionInsert;

/**
 * @deprecated Use {@link SurveyVote} instead. This alias will be removed in a future version.
 */
export type SurveyVoteOutput = SurveyVote;

/**
 * @deprecated Use {@link SurveyVoteInsert} instead. This alias will be removed in a future version.
 */
export type SurveyVoteInput = SurveyVoteInsert;
