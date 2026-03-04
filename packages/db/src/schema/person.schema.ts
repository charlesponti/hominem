import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  index,
  integer,
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

    // Relationship information (from relationships table)
    date_started: text('date_started'), // When relationship started
    date_ended: text('date_ended'), // When relationship ended
    location: text('location'), // Where they're from/based
    profession: text('profession'),
    education: text('education'),

    // Lifestyle & preferences
    diet: text('diet'),
    age: integer('age'),

    // Physical attributes & attraction
    attractiveness_score: integer('attractiveness_score'), // 1-5 scale
    
    // Intimate details (encrypted or access-controlled in production)
    kiss: integer('kiss'), // Scale or boolean
    sex: integer('sex'), // Scale or boolean

    // Additional notes
    details: text('details'), // General notes/details about the person
    notes: text('notes'), // Additional notes

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
    // Profession/education queries
    index('person_profession_idx').on(table.profession),
    // Location queries
    index('person_location_idx').on(table.location),
  ],
);

export type Person = InferSelectModel<typeof person>;
export type PersonInsert = InferInsertModel<typeof person>;
export type PersonSelect = Person;
