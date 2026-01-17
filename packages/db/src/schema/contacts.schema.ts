import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

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
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('contact_user_id_idx').on(table.userId),
    emailIdx: index('contact_email_idx').on(table.email),
  })
)

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
