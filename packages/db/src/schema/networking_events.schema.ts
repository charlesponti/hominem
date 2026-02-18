import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
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
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';
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
    attachments: jsonb('attachments').$type<Array<{ name: string; url: string }>>(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('ne_user_id_idx').on(table.userId),
    index('ne_date_idx').on(table.date),
    index('ne_type_idx').on(table.type),
  ],
);

export const NetworkingEventInsertSchema = createInsertSchema(networking_events, {
  createdAt: z.string(),
  updatedAt: z.string(),
  date: z.date(),
});
export const NetworkingEventSelectSchema = createSelectSchema(networking_events, {
  createdAt: z.string(),
  updatedAt: z.string(),
  date: z.date(),
});
export type NetworkingEventInput = z.infer<typeof NetworkingEventInsertSchema>;
export type NetworkingEventOutput = z.infer<typeof NetworkingEventSelectSchema>;

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
    isFollowedUp: boolean('is_followed_up').default(false),
    followUpDate: timestamp('follow_up_date'),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex('ne_attendee_unique_idx').on(table.networkingEventId, table.contactId),
    index('nea_event_id_idx').on(table.networkingEventId),
    index('nea_contact_id_idx').on(table.contactId),
  ],
);

export const NetworkingEventAttendeeInsertSchema = createInsertSchema(networking_event_attendees, {
  createdAt: z.string(),
  followUpDate: z.date().nullable(),
});
export const NetworkingEventAttendeeSelectSchema = createSelectSchema(networking_event_attendees, {
  createdAt: z.string(),
  followUpDate: z.date().nullable(),
});
export type NetworkingEventAttendeeInput = z.infer<typeof NetworkingEventAttendeeInsertSchema>;
export type NetworkingEventAttendeeOutput = z.infer<typeof NetworkingEventAttendeeSelectSchema>;
