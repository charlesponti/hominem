import { relations } from 'drizzle-orm'
import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const surveys = pgTable('surveys', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
})

export const surveyOptions = pgTable('survey_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  surveyId: uuid('survey_id')
    .references(() => surveys.id)
    .notNull(),
})

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
})

export const surveysRelations = relations(surveys, ({ many }) => ({
  options: many(surveyOptions),
  votes: many(surveyVotes),
}))

export const surveyOptionsRelations = relations(surveyOptions, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyOptions.surveyId],
    references: [surveys.id],
  }),
  votes: many(surveyVotes),
}))

export const surveyVotesRelations = relations(surveyVotes, ({ one }) => ({
  survey: one(surveys, {
    fields: [surveyVotes.surveyId],
    references: [surveys.id],
  }),
  option: one(surveyOptions, {
    fields: [surveyVotes.optionId],
    references: [surveyOptions.id],
  }),
}))
