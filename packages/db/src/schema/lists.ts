import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'

export const lists = pgTable('lists', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid('user_id').notNull(),
  name: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export const listInvites = pgTable('list_invites', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  listId: uuid('list_id').notNull(),
  userId: uuid('user_id').notNull(),
  invitedUserEmail: text('invited_user_email').notNull(),
  invitedUserId: uuid('invited_user_id'),
  accepted: boolean().default(false),
  token: text().notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export type ListSelect = typeof lists.$inferSelect
export type ListInviteSelect = typeof listInvites.$inferSelect
