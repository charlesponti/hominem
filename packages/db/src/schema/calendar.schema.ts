import { relations } from 'drizzle-orm'
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { contacts } from './contacts.schema'
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
export type EventTypeEnum = (typeof eventTypeEnum.enumValues)[number]

export const eventSourceEnum = pgEnum('event_source', ['manual', 'google_calendar'])
export type EventSourceEnum = (typeof eventSourceEnum.enumValues)[number]

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    date: timestamp('date').notNull(),
    placeId: uuid('place_id').references(() => place.id),
    dateStart: timestamp('date_start'),
    dateEnd: timestamp('date_end'),
    dateTime: timestamp('date_time'),
    type: eventTypeEnum('type').notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    source: eventSourceEnum('source').default('manual').notNull(),
    externalId: text('external_id'),
    calendarId: text('calendar_id'),
    lastSyncedAt: timestamp('last_synced_at'),
    syncError: text('sync_error'),
    /**
     * Notes about the visit (e.g., meal ordered)
     */
    visitNotes: text('visit_notes'),
    /**
     * User's rating of the place (1-5)
     */
    visitRating: integer('visit_rating'),
    /**
     * Written review of the visit
     */
    visitReview: text('visit_review'),
    /**
     * List of people who were present at this visit (JSON array or comma-separated)
     */
    visitPeople: text('visit_people'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('events_external_id_idx').on(table.externalId),
    index('events_calendar_id_idx').on(table.calendarId),
    index('events_source_idx').on(table.source),
    uniqueIndex('events_external_calendar_unique').on(table.externalId, table.calendarId),
  ]
)
export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  placeId: string | null;
  dateStart: Date | null;
  dateEnd: Date | null;
  dateTime: Date | null;
  type: EventTypeEnum;
  userId: string;
  source: EventSourceEnum;
  externalId: string | null;
  calendarId: string | null;
  lastSyncedAt: Date | null;
  syncError: string | null;
  visitNotes: string | null;
  visitRating: number | null;
  visitReview: string | null;
  visitPeople: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export type CalendarEventSelect = CalendarEvent;
export interface CalendarEventInsert {
  id: string;
  title: string;
  description?: string | null;
  date: Date;
  placeId?: string | null;
  dateStart?: Date | null;
  dateEnd?: Date | null;
  dateTime?: Date | null;
  type: EventTypeEnum;
  userId: string;
  source?: EventSourceEnum;
  externalId?: string | null;
  calendarId?: string | null;
  lastSyncedAt?: Date | null;
  syncError?: string | null;
  visitNotes?: string | null;
  visitRating?: number | null;
  visitReview?: string | null;
  visitPeople?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export const eventsTags = pgTable('events_tags', {
  eventId: uuid('event_id').references(() => events.id),
  tagId: uuid('tag_id').references(() => tags.id),
})

export const eventsUsers = pgTable('events_users', {
  eventId: uuid('event_id').references(() => events.id),
  personId: uuid('person_id').references(() => contacts.id),
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
