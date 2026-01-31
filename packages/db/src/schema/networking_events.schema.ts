import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { contacts } from './contacts.schema'; // For attendees
import { users } from './users.schema';

export const eventTypeEnum = pgEnum('event_type', [
  'Conference',
  'Meetup',
  'Webinar',
  'Workshop',
  'JobFair',
  'Seminar',
  'Other',
]);

export const networking_events = pgTable(
  'networking_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // User who logged this event
    name: text('name').notNull(),
    description: text('description'),
    type: eventTypeEnum('type'),
    date: timestamp('date').notNull(),
    location: text('location'), // Can be physical address or URL for online events
    organizer: text('organizer'), // Name of the organizing body or person
    website: text('website'),
    notes: text('notes'), // User's personal notes about the event
    keyTakeaways: text('key_takeaways'),
    attachments: jsonb('attachments'), // e.g., [{ name: 'Presentation Slides', url: '...' }]
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('ne_user_id_idx').on(table.userId),
    dateIdx: index('ne_date_idx').on(table.date),
    typeIdx: index('ne_type_idx').on(table.type),
  }),
);

export type NetworkingEvent = InferSelectModel<typeof networking_events>;
export type NetworkingEventInsert = InferInsertModel<typeof networking_events>;
export type NetworkingEventSelect = NetworkingEvent;
export type NewNetworkingEvent = NetworkingEventInsert;

// Junction table for contacts met at networking events
export const networking_event_attendees = pgTable(
  'networking_event_attendees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    networkingEventId: uuid('networking_event_id')
      .notNull()
      .references(() => networking_events.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    notes: text('notes'), // Specific notes about interaction with this contact at this event
    followedUp: boolean('followed_up').default(false),
    followUpDate: timestamp('follow_up_date'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    eventAttendeeIdx: uniqueIndex('ne_attendee_unique_idx').on(
      table.networkingEventId,
      table.contactId,
    ),
    eventIdx: index('nea_event_id_idx').on(table.networkingEventId),
    contactIdx: index('nea_contact_id_idx').on(table.contactId),
  }),
);

export type NetworkingEventAttendee = InferSelectModel<typeof networking_event_attendees>;
export type NetworkingEventAttendeeInsert = InferInsertModel<typeof networking_event_attendees>;
export type NewNetworkingEventAttendee = NetworkingEventAttendeeInsert;
