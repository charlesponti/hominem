import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-zod'

export const users = pgTable(
  'users',
  {
    email: text('email').notNull(),
    photoUrl: text('photo_url'),
    birthday: text('birthday'),
    id: uuid('id').primaryKey().notNull(),
    name: text('name'),
    image: text('image'),
    clerkId: text('clerk_id').unique(),
    isAdmin: boolean('isAdmin').default(false).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    emailVerified: timestamp('emailVerified', { precision: 3, mode: 'string' }),
  },
  (table) => [
    uniqueIndex('User_email_key').using('btree', table.email.asc().nullsLast()),
    index('email_idx').on(table.email),
    index('clerk_id_idx').on(table.clerkId),
  ]
)
export type UserInsert = typeof users.$inferInsert
export type User = typeof users.$inferSelect
export const UserSchema = createInsertSchema(users)

export const account = pgTable(
  'account',
  {
    id: uuid('id').primaryKey().notNull(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: timestamp('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (table) => [
    uniqueIndex('Account_provider_providerAccountId_key').using(
      'btree',
      table.provider.asc().nullsLast(),
      table.providerAccountId.asc().nullsLast()
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'account_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)
