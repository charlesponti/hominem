import { index, pgTable, uuid } from 'drizzle-orm/pg-core';

import { contacts } from './contacts.schema';
import { tags } from './tags.schema';
import { transactions } from './finance.schema';
import { events } from './calendar-events.schema';

/**
 * Events-Tags Junction Table
 */
export const eventsTags = pgTable('events_tags', {
  eventId: uuid('event_id').references(() => events.id),
  tagId: uuid('tag_id').references(() => tags.id),
});

/**
 * Events-Users (Contacts) Junction Table
 */
export const eventsUsers = pgTable(
  'events_users',
  {
    eventId: uuid('event_id').references(() => events.id),
    personId: uuid('person_id').references(() => contacts.id),
  },
  (table) => [
    index('events_users_event_id_idx').on(table.eventId),
    index('events_users_person_id_idx').on(table.personId),
  ],
);

/**
 * Events-Transactions Junction Table
 */
export const eventsTransactions = pgTable(
  'events_transactions',
  {
    eventId: uuid('event_id').references(() => events.id),
    transactionId: uuid('transaction_id').references(() => transactions.id),
  },
  (table) => [
    index('events_transactions_event_id_idx').on(table.eventId),
    index('events_transactions_transaction_id_idx').on(table.transactionId),
  ],
);
