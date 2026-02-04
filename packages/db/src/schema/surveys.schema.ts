import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const surveys = pgTable('surveys', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
});

export type Survey = InferSelectModel<typeof surveys>;
export type SurveyInsert = InferInsertModel<typeof surveys>;
export type SurveySelect = Survey;

export const surveyOptions = pgTable('survey_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  surveyId: uuid('survey_id')
    .references(() => surveys.id)
    .notNull(),
});

export type SurveyOption = InferSelectModel<typeof surveyOptions>;
export type SurveyOptionInsert = InferInsertModel<typeof surveyOptions>;
export type SurveyOptionSelect = SurveyOption;

export const surveyVotes = pgTable('survey_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  optionId: uuid('option_id')
    .references(() => surveyOptions.id)
    .notNull(),
  surveyId: uuid('survey_id')
    .references(() => surveys.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
});

export type SurveyVote = InferSelectModel<typeof surveyVotes>;
export type SurveyVoteInsert = InferInsertModel<typeof surveyVotes>;
export type SurveyVoteSelect = SurveyVote;
