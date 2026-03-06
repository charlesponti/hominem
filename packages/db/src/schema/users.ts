import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  email: text().notNull(),
  name: text(),
  image: text(),
  emailVerified: boolean('email_verified').notNull().default(false),
  avatarUrl: text('avatar_url'),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type UserSelect = typeof users.$inferSelect
