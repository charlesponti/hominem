import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const person = pgTable(
  'person',
  {
    // Primary key and FK to users table
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Person profile fields
    first_name: text('first_name'),
    last_name: text('last_name'),
    middle_name: text('middle_name'),

    // Contact info (canonical, synced from contacts table)
    email: text('email'),
    phone: text('phone'),

    // Social/professional
    linkedin_url: text('linkedin_url'),

    // Additional info
    notes: text('notes'),

    // Timestamps
    created_at: timestamp('created_at', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // One person per user
    uniqueIndex('person_user_id_uidx').on(table.user_id),
    // Email lookups
    index('person_email_idx').on(table.email),
    // Name searches
    index('person_name_idx').on(table.first_name, table.last_name),
    // User queries
    index('person_user_id_idx').on(table.user_id),
  ],
);

export type Person = InferSelectModel<typeof person>;
export type PersonInsert = InferInsertModel<typeof person>;
export type PersonSelect = Person;
