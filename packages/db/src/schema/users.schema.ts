import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const users = pgTable(
  'users',
  {
    // Primary key for foreign key relationships
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    // User profile data (canonical identity)
    email: text('email').notNull(),
    name: text('name'),
    image: text('image'),

    // Auth fields
    email_verified: boolean('email_verified').default(false).notNull(),
    password_hash: text('password_hash'), // nullable for OAuth-only users

    // Admin status
    is_admin: boolean('is_admin').default(false).notNull(),

    // Timestamps (TIMESTAMP WITH TIME ZONE in migration)
    created_at: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),

    // Optional fields
    birthday: text('birthday'),
  },
  (table) => [
    // Email index for lookups
    index('users_email_idx').on(table.email),

    // Unique constraint on email
    uniqueIndex('users_email_uidx').on(table.email),
  ],
);
export type User = InferSelectModel<typeof users>;
export type UserInsert = InferInsertModel<typeof users>;
export type UserSelect = User;

export const account = pgTable(
  'account',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
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
      table.providerAccountId.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'account_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);
export type Account = InferSelectModel<typeof account>;
export type AccountInsert = InferInsertModel<typeof account>;
export type AccountSelect = Account;

// Zod Validation Schemas
export const UserSchema = createInsertSchema(users);
export type UserSchemaType = typeof UserSchema;
