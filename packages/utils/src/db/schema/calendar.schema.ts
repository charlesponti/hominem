import { relations } from 'drizzle-orm'
import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { transactions } from './finance.schema'
import { place } from './places.schema'
import { tags } from './tags.schema'
import { users } from './users.schema'

// Enums
export const eventTypeEnum = pgEnum('event_type', [
  'Transactions',
  'Events',
  'Birthdays',
  'Anniversaries',
  'Dates',
  'Messages',
  'Photos',
  'Relationship Start',
  'Relationship End',
  'Sex',
  'Movies',
  'Reading',
])

export const events = pgTable('events', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  date: timestamp('date').notNull(),
  placeId: uuid('place_id').references(() => place.id),
  dateStart: timestamp('date_start'),
  dateEnd: timestamp('date_end'),
  dateTime: timestamp('date_time'),
  type: eventTypeEnum('type').notNull(),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})
export type CalendarEvent = typeof events.$inferSelect
export type CalendarEventInsert = typeof events.$inferInsert

export const eventsTags = pgTable('events_tags', {
  eventId: uuid('event_id').references(() => events.id),
  tagId: uuid('tag_id').references(() => tags.id),
})

export const eventsUsers = pgTable('events_users', {
  eventId: uuid('event_id').references(() => events.id),
  personId: uuid('person_id').references(() => users.id),
})

export const placeVisits = pgTable('place_visits', {
  eventId: uuid('event_id').references(() => events.id),
  placeId: uuid('place_id').references(() => place.id),
  /**
   * The meal that the user had at this place.
   */
  notes: text('notes'),
  /**
   * The rating that the user gave to this place.
   */
  rating: integer('rating'),
  /**
   * The review that the user wrote for this place.
   */
  review: text('review'),
  /**
   * List of user IDs of people who were with the user at this place.
   */
  people: text('people'),

  userId: uuid('user_id').references(() => users.id),
})

export const eventsTransactions = pgTable('events_transactions', {
  eventId: uuid('event_id').references(() => events.id),
  transactionId: uuid('transaction_id').references(() => transactions.id),
})

// Relations
export const eventsRelations = relations(events, ({ many, one }) => ({
  place: one(place, {
    fields: [events.placeId],
    references: [place.id],
  }),
  tags: many(eventsTags),
  users: many(eventsUsers),
  transactions: many(eventsTransactions),
}))

export const eventsTagsRelations = relations(eventsTags, ({ one }) => ({
  event: one(events, {
    fields: [eventsTags.eventId],
    references: [events.id],
  }),
  tag: one(tags, {
    fields: [eventsTags.tagId],
    references: [tags.id],
  }),
}))
