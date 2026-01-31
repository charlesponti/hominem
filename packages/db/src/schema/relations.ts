import { relations } from 'drizzle-orm';

import { token, session } from './auth.schema';
import { bookmark } from './bookmarks.schema';
import { events, eventsTags, eventsUsers, eventsTransactions } from './calendar.schema';
import { jobs, job_applications, application_stages, work_experiences } from './career.schema';
import { categories } from './categories.schema';
import { chat, chatMessage } from './chats.schema';
import { companies } from './company.schema';
import { content, contentStrategies } from './content.schema';
import {
  financialInstitutions,
  plaidItems,
  financeAccounts,
  transactions,
  budgetCategories,
  budgetGoals,
} from './finance.schema';
import { item } from './items.schema';
import { list, userLists, listInvite } from './lists.schema';
import { movie, movieViewings } from './movies.schema';
import { notes } from './notes.schema';
import { place } from './places.schema';
import { surveys, surveyOptions, surveyVotes } from './surveys.schema';
import { tags } from './tags.schema';
import { flight } from './travel.schema';
import { tripItems } from './trip_items.schema';
import { trips } from './trips.schema';
import { users } from './users.schema';

// ============================================
// AUTH & USERS
// ============================================

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(users, {
    fields: [session.userId],
    references: [users.id],
  }),
}));

export const tokenRelations = relations(token, ({ one }) => ({
  user: one(users, {
    fields: [token.userId],
    references: [users.id],
  }),
}));

// ============================================
// BOOKMARKS
// ============================================

export const bookmarkRelations = relations(bookmark, ({ one }) => ({
  user: one(users, {
    fields: [bookmark.userId],
    references: [users.id],
  }),
}));

// ============================================
// CALENDAR & EVENTS
// ============================================

export const eventsRelations = relations(events, ({ many, one }) => ({
  place: one(place, {
    fields: [events.placeId],
    references: [place.id],
  }),
  tags: many(eventsTags),
  users: many(eventsUsers),
  transactions: many(eventsTransactions),
}));

export const eventsTagsRelations = relations(eventsTags, ({ one }) => ({
  event: one(events, {
    fields: [eventsTags.eventId],
    references: [events.id],
  }),
  tag: one(tags, {
    fields: [eventsTags.tagId],
    references: [tags.id],
  }),
}));

// ============================================
// CAREER & PROFESSIONAL
// ============================================

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id],
  }),
  jobApplications: many(job_applications),
}));

export const job_applicationsRelations = relations(job_applications, ({ one, many }) => ({
  job: one(jobs, {
    fields: [job_applications.jobId],
    references: [jobs.id],
  }),
  company: one(companies, {
    fields: [job_applications.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [job_applications.userId],
    references: [users.id],
  }),
  applicationStages: many(application_stages),
}));

export const application_stagesRelations = relations(application_stages, ({ one }) => ({
  jobApplication: one(job_applications, {
    fields: [application_stages.jobApplicationId],
    references: [job_applications.id],
  }),
}));

export const work_experiencesRelations = relations(work_experiences, ({ one }) => ({
  user: one(users, {
    fields: [work_experiences.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [work_experiences.companyId],
    references: [companies.id],
  }),
}));

// ============================================
// TAXONOMY (CATEGORIES & TAGS)
// ============================================

export const categoryRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parent_category',
  }),
  children: many(categories, {
    relationName: 'parent_category',
  }),
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
}));

// ============================================
// SOCIAL & COMMUNICATION
// ============================================

export const chatRelations = relations(chat, ({ one, many }) => ({
  user: one(users, {
    fields: [chat.userId],
    references: [users.id],
  }),
  chatMessages: many(chatMessage),
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  chat: one(chat, {
    fields: [chatMessage.chatId],
    references: [chat.id],
  }),
  user: one(users, {
    fields: [chatMessage.userId],
    references: [users.id],
  }),
}));

// ============================================
// CONTENT & KNOWLEDGE
// ============================================

export const contentRelations = relations(content, ({ one }) => ({
  user: one(users, {
    fields: [content.userId],
    references: [users.id],
  }),
  contentStrategy: one(contentStrategies, {
    fields: [content.contentStrategyId],
    references: [contentStrategies.id],
  }),
}));

export const contentStrategiesRelations = relations(contentStrategies, ({ one }) => ({
  user: one(users, {
    fields: [contentStrategies.userId],
    references: [users.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
}));

// ============================================
// FINANCE
// ============================================

export const financialInstitutionRelations = relations(financialInstitutions, ({ many }) => ({
  plaidItems: many(plaidItems),
  accounts: many(financeAccounts),
}));

export const plaidItemRelations = relations(plaidItems, ({ one, many }) => ({
  institution: one(financialInstitutions, {
    fields: [plaidItems.institutionId],
    references: [financialInstitutions.id],
  }),
  accounts: many(financeAccounts),
  user: one(users, {
    fields: [plaidItems.userId],
    references: [users.id],
  }),
}));

export const financeAccountRelations = relations(financeAccounts, ({ one, many }) => ({
  fromTransactions: many(transactions, { relationName: 'fromAccount' }),
  toTransactions: many(transactions, { relationName: 'toAccount' }),
  institution: one(financialInstitutions, {
    fields: [financeAccounts.institutionId],
    references: [financialInstitutions.id],
  }),
  plaidItem: one(plaidItems, {
    fields: [financeAccounts.plaidItemId],
    references: [plaidItems.id],
  }),
  user: one(users, {
    fields: [financeAccounts.userId],
    references: [users.id],
  }),
}));

export const transactionRelations = relations(transactions, ({ one }) => ({
  fromAccount: one(financeAccounts, {
    fields: [transactions.fromAccountId],
    references: [financeAccounts.id],
    relationName: 'fromAccount',
  }),
  toAccount: one(financeAccounts, {
    fields: [transactions.toAccountId],
    references: [financeAccounts.id],
    relationName: 'toAccount',
  }),
  category: one(budgetCategories, {
    fields: [transactions.category],
    references: [budgetCategories.id],
  }),
  account: one(financeAccounts, {
    fields: [transactions.accountId],
    references: [financeAccounts.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const budgetCategoryRelations = relations(budgetCategories, ({ many }) => ({
  goals: many(budgetGoals),
  transactions: many(transactions),
}));

// ============================================
// GOALS & PLANNING
// ============================================

export const surveysRelations = relations(surveys, ({ many }) => ({
  options: many(surveyOptions),
  votes: many(surveyVotes),
}));

export const surveyOptionsRelations = relations(surveyOptions, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyOptions.surveyId],
    references: [surveys.id],
  }),
  votes: many(surveyVotes),
}));

export const surveyVotesRelations = relations(surveyVotes, ({ one }) => ({
  survey: one(surveys, {
    fields: [surveyVotes.surveyId],
    references: [surveys.id],
  }),
  option: one(surveyOptions, {
    fields: [surveyVotes.optionId],
    references: [surveyOptions.id],
  }),
}));

// ============================================
// LISTS & ITEMS
// ============================================

export const itemRelations = relations(item, ({ one, many }) => ({
  list: one(list, {
    fields: [item.listId],
    references: [list.id],
  }),
  user: one(users, {
    fields: [item.userId],
    references: [users.id],
  }),
  places: many(place),
}));

export const listRelations = relations(list, ({ one, many }) => ({
  flights: many(flight),
  user: one(users, {
    fields: [list.ownerId],
    references: [users.id],
  }),
  items: many(item),
  userLists: many(userLists),
  listInvites: many(listInvite),
}));

export const userListsRelations = relations(userLists, ({ one }) => ({
  list: one(list, {
    fields: [userLists.listId],
    references: [list.id],
  }),
  user: one(users, {
    fields: [userLists.userId],
    references: [users.id],
  }),
}));

export const listInviteRelations = relations(listInvite, ({ one }) => ({
  list: one(list, {
    fields: [listInvite.listId],
    references: [list.id],
  }),
  user_invitedUserId: one(users, {
    fields: [listInvite.invitedUserId],
    references: [users.id],
    relationName: 'listInvite_invitedUserId_user_id',
  }),
  user_userId: one(users, {
    fields: [listInvite.userId],
    references: [users.id],
    relationName: 'listInvite_userId_user_id',
  }),
}));

// ============================================
// MEDIA & ENTERTAINMENT
// ============================================

export const movieViewingsRelations = relations(movieViewings, ({ one }) => ({
  movie: one(movie, {
    fields: [movieViewings.movieId],
    references: [movie.id],
  }),
  user: one(users, {
    fields: [movieViewings.userId],
    references: [users.id],
  }),
}));

export const movieRelations = relations(movie, ({ many }) => ({
  movieViewings: many(movieViewings),
}));

// ============================================
// PLACES & TRAVEL
// ============================================

export const placeRelations = relations(place, ({ one }) => ({
  item: one(item, {
    fields: [place.itemId],
    references: [item.id],
  }),
}));

export const flightRelations = relations(flight, ({ one }) => ({
  user: one(users, {
    fields: [flight.userId],
    references: [users.id],
  }),
  list: one(list, {
    fields: [flight.listId],
    references: [list.id],
  }),
}));

export const tripItemsRelations = relations(tripItems, ({ one }) => ({
  trip: one(trips, {
    fields: [tripItems.tripId],
    references: [trips.id],
  }),
  item: one(item, {
    fields: [tripItems.itemId],
    references: [item.id],
  }),
}));

export const tripsRelations = relations(trips, ({ one }) => ({
  user: one(users, {
    fields: [trips.userId],
    references: [users.id],
  }),
}));
