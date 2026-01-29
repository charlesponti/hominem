/**
 * Computed Survey Types
 */

import type {
  Survey,
  SurveyInsert,
  SurveyOption,
  SurveyOptionInsert,
  SurveyVote,
  SurveyVoteInsert,
} from './surveys.schema';

export type SurveyOutput = Survey;
export type SurveyInput = SurveyInsert;

export type SurveyOptionOutput = SurveyOption;
export type SurveyOptionInput = SurveyOptionInsert;

export type SurveyVoteOutput = SurveyVote;
export type SurveyVoteInput = SurveyVoteInsert;

export { surveys, surveyOptions, surveyVotes, surveysRelations, surveyOptionsRelations, surveyVotesRelations } from './surveys.schema';
