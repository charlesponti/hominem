import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';
import { users } from './users.schema';

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name'),
    email: text('email'),
    phone: text('phone'),
    linkedinUrl: text('linkedin_url'),
    title: text('title'),
    notes: text('notes'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('contact_user_id_idx').on(table.userId),
    index('contact_email_idx').on(table.email),
  ],
);

export const ContactInsertSchema = createInsertSchema(contacts);
export const ContactSelectSchema = createSelectSchema(contacts);
export type ContactInsertSchemaType = z.infer<typeof ContactInsertSchema>;
export type ContactSelectSchemaType = z.infer<typeof ContactSelectSchema>;
export type Contact = ContactSelectSchemaType;
export type ContactInsert = ContactInsertSchemaType;
