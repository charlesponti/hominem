import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { job_applications } from './career.schema'
import { companies } from './company.schema'
import { users } from './users.schema'

export const contactSourceEnum = pgEnum('contact_source', [
  'LinkedIn',
  'NetworkingEvent',
  'Referral',
  'JobApplication',
  'PersonalConnection',
  'ColdOutreach',
  'Other',
])

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
    source: contactSourceEnum('source'),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    jobApplicationId: uuid('job_application_id').references(() => job_applications.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('contact_user_id_idx').on(table.userId),
    companyIdx: index('contact_company_id_idx').on(table.companyId),
    emailIdx: index('contact_email_idx').on(table.email),
  })
)

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
